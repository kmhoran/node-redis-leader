import redis from "redis";
import { CronJob } from "cron";
import cluster from "cluster";
import os from "os";

const instanceId = Math.floor(Math.random() * 10000000 + 1);
const leaderId = "REDIS_LEADER";
let isLeader = false;
let isCommon = false;

const client = redis.createClient(6379, "127.0.0.1");
client.on("error", function(err) {
  console.error("there was a redis error");
});

client.del(leaderId, (err, response) => {
  if (response == 1) {
    console.log(`[${instanceId}] Redis leader key cleared.`);
  } else {
    console.error(`[${instanceId}] Unable to clear leader key!`);
  }
});

const setLeader = () => {
  if (isCommon) {
    isCommon = false;
    commonCron.stop();
  }
  if (!isLeader) {
    isLeader = true;
    leaderCron.start();
  }
};

const setCommon = () => {
  if(isLeader){
    isLeader = false;
    leaderCron.stop();
  }
  if(!isCommon){
    isCommon = true;
    commonCron.start();
  }
}

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
            setLeader();
          } else {
            setCommon();
          }
        });
      }, 5000);
    } else if(reply == instanceId){
      setLeader();
    } else{
      setCommon();
    }
    
  });
});

const leaderCron = new CronJob("*/3 * * * * *", () => {
  console.log(`[${instanceId}] Performing my leadership duties.`);
});

const commonCron = new CronJob("*/4 * * * * *", () => {
  console.log(`[${instanceId}] I'll do something else.`);
});

if (cluster.isMaster) {
  // count the machine's CPUs
  const cpuCount = os.cpus().length;

  // Create a worker for each CPU
  for (let i = 0; i < cpuCount; i++) {
    cluster.fork();
  }

  // listen for terminating workers
  cluster.on("exit", worker => {
    // replace the terminated worker
    console.info(`Worker ${worder.id} died!`);
    cluster.fork();
  });

  // Code to run if we're in a worker process
} else {
  console.log(`initializing instance ${instanceId}`);
  checkForLeader.start();
}
