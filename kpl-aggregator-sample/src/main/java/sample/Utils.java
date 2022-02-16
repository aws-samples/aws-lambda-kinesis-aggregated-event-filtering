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

import com.amazonaws.util.DateUtils;
import org.apache.commons.lang3.RandomUtils;

import java.math.BigInteger;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

public class Utils {

    /**
     * Generates a blob containing a UTF-8 string. The string begins with the
     * sequence number in decimal notation, followed by a space, followed by
     * padding.
     * 
     * @param sequenceNumber
     *            The sequence number to place at the beginning of the record
     *            data.
     * @param totalLen
     *            Total length of the data. After the sequence number, padding
     *            is added until this length is reached.
     * @return ByteBuffer containing the blob
     */
    public static String[] SAMPLE_RECORD_TYPES={"RAISE_HAND","CHAT","JOIN_MEETING","LEAVE_MEETING","START_SCREEN_SHARE","END_SCREEN_SHARE"};
    public static List<Map<String,String>> generateEvents(AtomicLong atomicLong){
        List<Map<String,String>> events =new ArrayList<>();
        for (int i = 0; i < RandomUtils.nextInt(0,200); i++) {
            events.add(generateEvent(atomicLong.getAndIncrement()));
        }
        return events;
    }
    public static Map<String,String> generateEvent(Long sequenceNumber){

        Map<String,String> event = new HashMap<String,String>();
        event.put( "productId","CHIME");
        event.put( "date", DateUtils.formatISO8601Date(new Date()));
        event.put("type",SAMPLE_RECORD_TYPES[RandomUtils.nextInt(0,SAMPLE_RECORD_TYPES.length)]);
        event.put("clientId",UUID.randomUUID().toString());
        event.put("tenantId",UUID.randomUUID().toString());
        event.put("userId",UUID.randomUUID().toString());
        event.put("userType","USER");
        event.put("userAgent","Ruby");
        event.put("result","true");
        event.put("sequenceNumber",sequenceNumber.toString());

        return event;
    }

}
