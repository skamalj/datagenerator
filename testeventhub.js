const { EventHubConsumerClient } = require("@azure/event-hubs");

const connectionString = "";    
const eventHubName = "myhub";
const consumerGroup = "$Default";

const consumerClient = new EventHubConsumerClient(consumerGroup, connectionString, eventHubName);

async function main() {
  // Subscribe to the events, and specify handlers for processing the events and errors.
  const subscription = consumerClient.subscribe({
      processEvents: async (events, context) => {
        if (events.length === 0) {
          console.log(`No events received within wait time. Waiting for next interval`);
          return;
        }

        for (const event of events) {
          console.log(`Received event: '${event.body}' from partition: '${context.partitionId}' and consumer group: '${context.consumerGroup}'`);
        }
      },
      processError: async (err, context) => {
        console.log(`Error : ${err}`);
      }
    }
  );
}

main();
