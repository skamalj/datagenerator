const { Kafka } = require('kafkajs')
const kafka = new Kafka({
    clientId: 'my-app',
    brokers: ['pkc-41p56.asia-south1.gcp.confluent.cloud:9092'],
    // authenticationTimeout: 1000,
    // reauthenticationThreshold: 10000,
    ssl: true,
    sasl: {
      mechanism: 'plain', // scram-sha-256 or scram-sha-512
      username: 'XJO5XTJLTALVNFFO',
      password: '+5hBTLTJYIUPDdv5c0hR7Pzm/88fP3DejXBW9/LYrf3gB0vM0GJtJnR4wjabOsAB'
    },
  })

const producer = kafka.producer()

const consumer = kafka.consumer({ groupId: 'my-group' })

async function produce() {
    producer.connect()
    .then(() => {
        console.log('producer connected')
        return producer.send({
            topic: 'mytopic',
            messages: [
                { key: 'key7', value: 'hello world' },
                { key: 'key8', value: 'hey hey!' },
                { key: 'key5', value: 'hey hey!' },
                { key: 'key6', value: 'hey hey!' }
            ],
            acks: 0
        })
    })
    .then(() => {
        console.log('message sent');
        producer.disconnect();
    })
}

async function consume() {
    await consumer.connect()

    await consumer.subscribe({ topic: 'mytopic' })
    await consumer.run({
        eachMessage: async ({ topic, partition, message, heartbeat }) => {
            console.log({
                key: message.key.toString(),
                value: message.value.toString(),
                headers: message.headers,
            })
        },
    })
}
produce()
//consume()