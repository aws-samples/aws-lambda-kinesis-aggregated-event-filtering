/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package sample;

import com.amazonaws.kinesis.agg.AggRecord;
import com.amazonaws.kinesis.agg.RecordAggregator;
import com.amazonaws.services.kinesis.producer.*;
import com.google.common.util.concurrent.FutureCallback;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.gson.Gson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Consumer;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

/**
 * This sample producer generates random events of different types.
 * The events are pre-aggregated based on type using the kinesis-aggregation library (https://github.com/awslabs/kinesis-aggregation).
 * Aggregations are flushed before reaching the payload limit and at the end when the stream is closed.
 * When the aggregations are flushed they're sent to the KPL which sees it as a single message and thus does not apply aggregation allowing you
 * to specify the partition key
 */
public class SampleProducer {
    private static final Logger log = LoggerFactory.getLogger(SampleProducer.class);

    /**
     * iterates a blocking queue of events
     * @param <T>
     */
    static class QueueSpliterator<T> implements Spliterator<T> {
        private final BlockingQueue<T> queue;
        private long timeout;

        public QueueSpliterator(final BlockingQueue<T> queue, final long timeout) {
            this.queue = queue;
            this.timeout = timeout;
        }

        @Override
        public int characteristics() {
            return Spliterator.CONCURRENT | Spliterator.NONNULL | Spliterator.ORDERED;
        }

        @Override
        public long estimateSize() {
            return Long.MAX_VALUE;
        }

        @Override
        public boolean tryAdvance(final Consumer<? super T> action) {
            try {
                final T next = this.queue.poll(timeout, TimeUnit.SECONDS);
                if (next == null) {
                    log.info("Iterator empty");
                    return false;
                }
                action.accept(next);
                return true;
            } catch (final InterruptedException e) {
                log.error("Iterator error", e);
                return false;
            }
        }

        @Override
        public Spliterator<T> trySplit() {
            return null;
        }

    }

    public static void main(String[] args) throws Exception {
        final ExecutorService callbackThreadPool = Executors.newCachedThreadPool();
        final ScheduledExecutorService EXECUTOR = Executors.newScheduledThreadPool(1);
        final BlockingQueue<Map<String, String>> queue = new LinkedBlockingQueue<>();
        //This is a map of RecordAggregator by event type
        final Map<String, RecordAggregator> aggregatorMap = new HashMap<String, RecordAggregator>();
        final Gson gson = new Gson();
        final SampleProducerConfig config = new SampleProducerConfig(args);
        long total = config.getRecordsPerSecond() * config.getSecondsToRun();
        final int sampleDataSize = gson.toJson(Utils.generateEvent(0L)).getBytes(StandardCharsets.UTF_8).length;
        final long totalSampleDataSize = total * sampleDataSize;
        log.info(String.format("Stream name: %s Region: %s secondsToRun %d", config.getStreamName(), config.getRegion(),
                config.getSecondsToRun()));
        log.info(String.format("Will attempt to run the KPL at %f MB/s...", (sampleDataSize * config
                .getRecordsPerSecond()) / (1000000.0)));
        final int aggregatorMaxBytes = 900000;
        final KinesisProducer producer = new KinesisProducer(config.transformToKinesisProducerConfiguration());

        // The monotonically increasing sequence number we will put in the data of each record
        final AtomicLong sequenceNumber = new AtomicLong(0);

        // The number of records that have finished (either successfully put, or failed)
        final AtomicLong completed = new AtomicLong(0);

        // KinesisProducer.addUserRecord is asynchronous. A callback can be used to receive the results.
        final FutureCallback<UserRecordResult> callback = new FutureCallback<UserRecordResult>() {
            @Override
            public void onFailure(Throwable t) {
                // If we see any failures, we will log them.
                if (t instanceof UserRecordFailedException) {
                    int attempts = ((UserRecordFailedException) t).getResult().getAttempts().size() - 1;
                    Attempt last = ((UserRecordFailedException) t).getResult().getAttempts().get(attempts);
                    if (attempts > 1) {
                        Attempt previous = ((UserRecordFailedException) t).getResult().getAttempts().get(attempts - 1);
                        log.error(String.format(
                                "Record failed to put - %s : %s. Previous failure - %s : %s",
                                last.getErrorCode(), last.getErrorMessage(), previous.getErrorCode(), previous.getErrorMessage()));
                    } else {
                        log.error(String.format(
                                "Record failed to put - %s : %s.",
                                last.getErrorCode(), last.getErrorMessage()));
                    }

                } else if (t instanceof UnexpectedMessageException) {
                    log.error("Record failed to put due to unexpected message received from native layer",
                            t);
                }
                log.error("Exception during put", t);
            }

            @Override
            public void onSuccess(UserRecordResult result) {
                completed.getAndIncrement();
            }
        };

        QueueSpliterator<Map<String, String>> queueIterator = new QueueSpliterator<Map<String, String>>(queue, 5);
        /**
         * Prints the status of the process updates
         */
        Runnable status = new Runnable() {
            @Override
            public void run() {
                long put = sequenceNumber.get();

                double putPercent = 100.0 * put / total;
                long done = completed.get();
                double donePercent = 100.0 * (done * aggregatorMaxBytes) / totalSampleDataSize;
                log.info(String.format(
                        "Put %d of %d so far (%.2f %%), %d have completed (~ %.2f %%)",
                        put, total, putPercent, done, donePercent));
                log.info(String.format("Oldest future as of now in millis is %s", producer.getOldestRecordTimeInMillis
                        ()));
            }
        };

        // This gives us progress updates
        EXECUTOR.scheduleAtFixedRate(status, 1, 1, TimeUnit.SECONDS);

        // Kick off the puts
        log.info(String.format(
                "Starting puts... will run for %d seconds at %d records per second", config.getSecondsToRun(),
                config.getRecordsPerSecond()));
        // This actually pumps generated event data into the blocking queue which the stream then events off of
        executeAtTargetRate(EXECUTOR, sequenceNumber, config.getSecondsToRun(),
                config.getRecordsPerSecond(), queue);
        /**
         * Here we create a stream fed by the block queue iterator...
         */
        Stream<Map<String, String>> s = StreamSupport.stream(queueIterator, true).onClose(() -> {
            //When we close the stream flush any aggregators lefts
            log.info("Flushing aggregatorMap");
            aggregatorMap.values().forEach(recordAggregator -> {
                AggRecord aggRecord = recordAggregator.clearAndGet();
                ListenableFuture<UserRecordResult> f =
                        producer.addUserRecord(config.getStreamName(), aggRecord.getPartitionKey(), aggRecord.getExplicitHashKey(), ByteBuffer.wrap(aggRecord.toRecordBytes()));
                Futures.addCallback(f, callback, callbackThreadPool);
            });
        });
        /**
         * Here we're mapping each event to a RecordAggregator by type.
         */
        s.map(event -> {

            String type = event.get("type");
            RecordAggregator recordAggregator = aggregatorMap.getOrDefault(type, new RecordAggregator());
            aggregatorMap.put(type, recordAggregator);
            try {
                recordAggregator.addUserRecord(type, gson.toJson(event).getBytes(StandardCharsets.UTF_8));
            } catch (Exception e) {
                e.printStackTrace();
            }

            return recordAggregator;
        }).forEach(recordAggregator -> {
            //only flush the aggregator when we get close to the payload limit of 1mb
            if (recordAggregator.getSizeBytes() > aggregatorMaxBytes) {
                log.info("Flushing aggregator- # " + recordAggregator.getNumUserRecords() + " bytes: " + recordAggregator.getSizeBytes());
                AggRecord aggRecord = recordAggregator.clearAndGet();

                ListenableFuture<UserRecordResult> f =
                        producer.addUserRecord(config.getStreamName(), aggRecord.getPartitionKey(), aggRecord.getExplicitHashKey(), ByteBuffer.wrap(aggRecord.toRecordBytes()));
                Futures.addCallback(f, callback, callbackThreadPool);
            }
        });


        EXECUTOR.awaitTermination(config.getSecondsToRun() + 1, TimeUnit.SECONDS);
        log.info("Closing event stream");
        s.close();
        // If you need to shutdown your application, call flushSync() first to
        // send any buffered records. This method will block until all records
        // have finished (either success or fail). There are also asynchronous
        // flush methods available.
        // Records are also automatically flushed by the KPL after a while based
        // on the time limit set with Configuration.setRecordMaxBufferedTime()
        log.info("Waiting for remaining puts to finish...");
        producer.flushSync();
        log.info("All records complete.");
        // This kills the child process and shuts down the threads managing it.
        producer.destroy();
        log.info("Finished.");
        log.info("Shutting down callback thread pool.");
        callbackThreadPool.shutdown();
        callbackThreadPool.awaitTermination(5, TimeUnit.SECONDS);
        status.run();
        System.exit(0);
    }

    /**
     * Executes a function N times per second for M seconds with a
     * ScheduledExecutorService. The executor is shutdown at the end. This is
     * more precise than simply using scheduleAtFixedRate.
     *
     * @param exec            Executor
     * @param counter         Counter used to track how many times the task has been
     *                        executed
     * @param durationSeconds How many seconds to run for
     * @param ratePerSecond   How many times to execute task per second
     */
    private static void executeAtTargetRate(
            final ScheduledExecutorService exec,
            final AtomicLong counter,
            final int durationSeconds,
            final int ratePerSecond,
            final BlockingQueue<Map<String, String>> queue) {
        exec.scheduleWithFixedDelay(new Runnable() {
            final long startTime = System.nanoTime();

            @Override
            public void run() {
                double secondsRun = (System.nanoTime() - startTime) / 1e9;
                double targetCount = Math.min(durationSeconds, secondsRun) * ratePerSecond;

                while (counter.get() < targetCount) {
                    try {
                        if (queue.offer(Utils.generateEvent(counter.get()))) {
                            counter.incrementAndGet();
                        }
                    } catch (Exception e) {
                        log.error("Error running task", e);
                        System.exit(1);
                    }
                }

                if (secondsRun >= durationSeconds) {
                    exec.shutdown();
                }
            }
        }, 1000, 1, TimeUnit.MILLISECONDS);
    }

}

