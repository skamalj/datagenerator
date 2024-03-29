# Fibber - Mock any API,  Generate Unlimited Fake Data

* [Overview](#overview)
* [install](#install)
* [Sinks](#configure-sinks)
* [Record Schema Configuration](#record-schema-configuration)
  * [Master](#master-record)
  * [Reference](#reference-records)
    * [Ref record with Raster](#ref-records-with-master)
  * [Source](#source-type-records)
    * [Failure Simulation](#source-failure-simulation)
    * [Record schema with source](#source-sample-configuration)
      * [Sample records with source config](#output-for-above-config)
* [Mock API](#ref-records-as-api-mocks)
* [Schema API](#schema-api)
* [Using Generator](#execution)
* [Examples](#some-examples)

## Overview
API Mocker and data generator is based on [faker nodejs library](https://fakerjs.dev/api/). 
Data is generated in JSON format.  Required schema definition file maps record field to faker API method. This is then used by record generator to generate fake records and send to configured Sinks.
Data can be streamed into destinations or batched into files.

These featutres are supported:-
* Mock any API - Support GET, DELETE, POST
* Send fake data to:-
  * Socket
  * AWS Kinesis
  * Google Cloud PubSub
  * Azure Events Hub
  * Kafka on Confluent Cloud
  * File (Local or S3)


## Install 
Install dependencies (faker library must be installed as dev dependency)
>`npm install`
>`npm install --save-dev  @faker-js/faker`

## Configure Sinks
Runtime environment is set in `.env` file. Move sample.env file to .env and set the values as needed.
* It allows you to enable multiple sinks at the same time if you want.
* Read sample.env for details
* To enable PubSub, make sure you have set application default login `gcloud auth application-default login`
* For AWS you should have default profile set or set AWS_PROFILE environment variable
* For Azure use `az login` 

## Record Schema Configuration
Record configuration is in schema file and uses YAML format. Default is schema/config.yaml.
Each entry in config file denotes the field in the record and the Faker functions which needs to be called.

### **Using faker**
Faker functioon is called `namespace.function`. These are described [here](https://fakerjs.dev/api/). Namespace and function are two options you specify when defining a field in record schema.


### **Master Record**
Master record is the only record for which records are generated and sent to Sinks.
```
records:
  - type: <Master>
    schema:
      - name: < This is field name >
        namespace: <faker namespace to which this function belongs >
        function: <faker function>
        args: [<arguments to be passed to faker funtion enclosed in array>]
        anomaly:  <introduces anomaly in the data, see example 2>
          magnitude: <Multiplier for the data>
          frequency: <%age of samles in which to introduce anomaly>
```

### **Reference Records**
If you need to generate data against fixed set of master records Ex. across 'X' number of customers 
, buying 'Y' number of products in some quantities.  In this case 'Ref' records can be used for customers and Products, which can then be used to generate master transactions/records.

Below configuration generates around 12 customer records.   As 'cust_id' is marked as unique, duplicates records will be discarded, giving you less records than 'count'.
```
records:
  - type: Ref
    name: customer
    count: 12
    schema:
      - name: cust_id
        namespace: datatype
        unique: true
        function: number
        args: [{"min":0,"max":10}]
      - name: firstname
        namespace: name
        function: firstName
        args: [1]
      - name: lastname
        namespace: name
        function: lastName
```

### **Ref records with Master**
In this case specify namespace as "ref" and fucntion as the name of Ref record. This will pick single record at random from the generated records and insert into master record.

```
  - type: Master
    schema:
      - name: customer
        namespace: ref
        function: customer
```

### **Source type records**
If you need to send data for 10 devices at regular interval, you cannot do that with master/ref records.  If you configure 10 devices using range 1..10 and generate record using master, then following happens
* one device is selected at random from 10 devices
* Master record is generated for that device
* Repeat, now notice that since device selection is random, same device can be picked up for generating record or any other
   * What we actually need is to generate 10 records, simultaneously,  at any point in time for 10 devices and then repeat at certain interval. 

Now if you define devices as sources, data is generated in following way:-
* Multiple generator are created once for each source with the set interval (say 5 secs)
* At each interval you will get data records for each source/device

#### **Source Failure Simulation**
* To simulate source failure, set probability of source failure - 0.01 - 100. At each iteration/interval probability is calculated for each source for failure and are taken out of generator.
* You can also set min. number of sources which should remain to override failure simulation.  No sources will be marked fail if number of sources falls to this level

Caution:  If you are planning on large number of sources, then keep you interval large as well else you will overwhelm  your system

In below sample 10 records are generated every 'X' interval for each source.

`Note that you do not need to refer source records in master unlike ref records`

#### Source sample configuration
```
records:
  - type: Source
    count: 10
    failure_simulation:
      probability: 10
      min_source_recs: 5
    schema:
      - name: device_id
        namespace: datatype
        unique: true
        function: number
        args: [{"min":1000,"max":9999}]
      - name: factory_id
        namespace: datatype
        function: number
        args: [{"min":1,"max":5}]
      - name: section
        namespace: helpers
        function: randomize
        args: [["A","B","C","D","E","F"]]
      - name: sensor_type
        namespace: helpers
        function: randomize
        args: [["Temp","Vibration","Pressure","Proximity","Smoke","Level"]]
  - type: Master
    schema:
      - name: value
        namespace: datatype
        function: number
        args: [{"min":20,"max":50}]
```
#### Output for above config
```
{"value":28,"eventtime":1642228409846,"source":{"device_id":2746,"factory_id":5,"section":"B","sensor_type":"Proximity"}}
{"value":32,"eventtime":1642228409846,"source":{"device_id":8676,"factory_id":3,"section":"F","sensor_type":"Temp"}}
{"value":45,"eventtime":1642228409846,"source":{"device_id":8736,"factory_id":4,"section":"A","sensor_type":"Temp"}}
{"value":36,"eventtime":1642228439853,"source":{"device_id":8595,"factory_id":1,"section":"F","sensor_type":"Smoke"}}
{"value":48,"eventtime":1642228439854,"source":{"device_id":7586,"factory_id":4,"section":"D","sensor_type":"Proximity"}}
{"value":42,"eventtime":1642228439854,"source":{"device_id":2746,"factory_id":5,"section":"B","sensor_type":"Proximity"}}
{"value":27,"eventtime":1642228439854,"source":{"device_id":8676,"factory_id":3,"section":"F","sensor_type":"Temp"}}
{"value":29,"eventtime":1642228439854,"source":{"device_id":8736,"factory_id":4,"section":"A","sensor_type":"Temp"}}
```

## Ref records as API Mocks
* All Ref records are available as API Mocks at endpoint `/mock/<recordname>`
  * GET /
  * GET /{id}
    * id is matched against whatver is name of first field in record schema
  * DELETE /{id}
  * POST /
    * Record JSON as request body 

## Schema API
`/schema` API endpoint can also be used to configure reference and source records. This end point support GET, GET /{schema}, POST and DELETE /{schema} operations.

POST accepts record schema as JSON. You can first GET the records and used those to generate new ones. Records are still saved as YAML files.

## Execution

Below command generates one record each second for 1 min and writes them to port 4000 or PORT set in .env file. 
`npm start -- -i 1000 -t 1`

`nc localhost 4000` on separate terminal will show the generated data

Swagger endpoint is at `http://localhost:3000/api-docs/#/`

See help
```
node index.js -h
or
npm start -- -h

Options:
  -i, --interval <interval>       Interval in milliseconds between records
  -t, --timeout <timeout>         Timeout in minutes for generator
  -n, --noeventtime               Flag to disable adding event time to records
  -p, --port <port>               Specify port for tcp server, default is 4000
  -c, --csv                       Create csv formatted records
  -h, --help                      display help for command
  -s, --schemafile <schemafile>   Schemafile for record generation

```
Interval and port  can be set in .env file as well. Commandline input(`optional`)  will overide this value.

## Management Server
You can connect to management server on port 4001 (override in .env file)
Below commands are available 
```
source start <source id>
source stop <source id>
source count
source interval <interval>
```

Output is json formatted.
## Some Examples

### Example1 - Master Only
Config to generate sale records for Y number of items for X number of users

> ![example1.yaml](schema/example1.yaml)
```
records:
  - type: Master
    schema:
      - name: user
        namespace: datatype
        function: number
        args: [{"min":0,"max":3}]
      - name: item
        namespace: helpers
        function: randomize
        args: [["itemA","itemB","itemC"]]
      - name: quantity
        namespace: datatype
        function: number
        args: [{"min":-10,"max":10}]
```
### Sample Output
```
{"user":3,"item":"itemC","quantity":7,"eventtime":1631377288497}
{"user":2,"item":"itemA","quantity":4,"eventtime":1631377290499}
{"user":1,"item":"itemC","quantity":10,"eventtime":1631377292499}
{"user":3,"item":"itemC","quantity":-5,"eventtime":1631377294502}
{"user":3,"item":"itemC","quantity":-2,"eventtime":1631377296504}
```

### Example2 - Master with anomaly
Below config generates temperature sensor data for 10 sensors

> ![example2.yaml](schema/example2.yaml)
```
records:
  - type: Master
    schema:
      - name: id
        namespace: datatype
        function: number
        args: [{"min":0,"max":10}]
      - name: temp
        namespace: datatype
        function: float
        args: [{"min":20,"max":50}]
        anomaly:
          magnitude: 5
          frequency: 20        
```

### Sample output
```
{"id":2,"value":32.15}
{"id":4,"value":24.33}
{"id":3,"value":39.57}
{"id":4,"value":29.81}
```

### Example3 - Master, multiple functions including date
Create employee data. Since this is random, it cannot gurantee duplicates or that employee will not have two joining dates.

> ![example3.yaml](schema/example3.yaml)

```
records:
  - type: Master
    schema:
      - name: id
        namespace: datatype
        function: number
      - name: firstname
        namespace: name
        function: firstName
        args: [1]
      - name: lastname
        namespace: name
        function: lastName
      - name: email
        namespace: internet
        function: email        
      - name: phone
        namespace: phone
        function: phoneNumber
      - name: joiningDate
        namespace: date
        function: past
        args: ["5","01-01-2017"]
```
### Sample output 
```
{"id":3998,"firstName":"Melinda","lastName":"Robel","email":"Ashton_Tremblay29@yahoo.com","phone":"(490) 786-0551 x28738","joiningDate":"2012-09-12T08:50:54.989Z"}
{"id":53727,"firstName":"Kristin","lastName":"Baumbach","email":"Nolan.Bernier@hotmail.com","phone":"786-594-4418 x7232","joiningDate":"2012-03-29T03:20:47.244Z"}
{"id":76041,"firstName":"Krystal","lastName":"Sawayn","email":"Jaleel79@hotmail.com","phone":"(520) 411-6918 x52633","joiningDate":"2012-06-19T06:58:01.561Z"}
```

### Example4 - Master for text generation
Create random text with 6 words on each line separated by single space 
> ![example4.yaml](schema/example4.yaml)
```
records:
  - type: Master
    schema:
      - name: textline
        namespace: lorem
        function: words
        args: [6]
```
### Sample Output
```
{"textline":"et animi libero eos repudiandae sed"}
{"textline":"fuga molestiae est soluta porro molestias"}
{"textline":"laborum aliquam dolore unde placeat cum"}
{"textline":"magnam nisi quis hic dignissimos non"}
```
### Example5 - Master with Ref
Geneate transaction data for 10 customers across 10 products
> ![config.yaml](schema/config.yaml)

### Sample Output
```
{"customer":{"cust_id":9,"firstname":"Flora","lastname":"Kuhn"},"product":{"product_name":"Fantastic Metal Shirt","price":"985.00"},"quantity":40,"eventtime":1637908941015}
{"customer":{"cust_id":3,"firstname":"Leslie","lastname":"Franecki"},"product":{"product_name":"Fantastic Plastic Table","price":"640.00"},"quantity":38,"eventtime":1637908942016}
{"customer":{"cust_id":9,"firstname":"Flora","lastname":"Kuhn"},"product":{"product_name":"Fantastic Plastic Table","price":"640.00"},"quantity":45,"eventtime":1637908943018}
{"customer":{"cust_id":9,"firstname":"Flora","lastname":"Kuhn"},"product":{"product_name":"Tasty Fresh Bike","price":"246.00"},"quantity":29,"eventtime":1637908944019}
{"customer":{"cust_id":10,"firstname":"Erma","lastname":"Steuber"},"product":{"product_name":"Sleek Frozen Tuna","price":"210.00"},"quantity":39,"eventtime":1637908945021}
```