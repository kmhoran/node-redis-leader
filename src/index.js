import redis from "redis";
import { CronJob } from "cron";
import cluster from 'cluster';
import os from 'os';

const instanceId = Math.floor(Math.random() * 10000 + 1);
const leaderId = "REDIS_LEADER";

const client = redis.createClient(6379, "127.0.0.1");
client.on("error", function(err) {
  console.error("there was a redis error");
});

client.flushdb(() => {
  console.log(`[${instanceId}] Redis flushed.`);
});

const checkForLeader = new CronJob("*/5 * * * * *", () => {
  client.get(leaderId, (err, reply) => {
    if (reply == null) {
      console.log(`[${instanceId}] No leader found. Running for leader.`);
      client.set(leaderId, instanceId);
      setTimeout(() => {
        client.get(leaderId, (err, secondReply) => {
          // claim to leadership has been established
          if (secondReply == instanceId) {
            console.log(`[${instanceId}] I'm the leader now!`);
            leaderCron.start();
          }
        });
      }, 2000);
    }
  });
});

const leaderCron = new CronJob("*/3 * * * * *", () => {
  console.log(`[${instanceId}] Performing my leadership duties.`);
});

console.log("initializing instance ", instanceId);

checkForLeader.start();
