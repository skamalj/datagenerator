Data generator based on [faker nodejs library](https://github.com/Marak/faker.js)

This supports sending streaming fake data to:-
* Socket
* AWS Kinesis
* Google Cloud PubSub
* Azure Events Hub

Runtime environment is set in `.env` file. Move sample.env file to .env and set the values as needed.
* It allows you to enable multiple sinks at the same time if you want.
* Read sample.env for details
* To enable PubSub, make sure you have set application default login `gcloud auth application-default login`
* For AWS you should have default profile set or set AWS_PROFILE environment variable
* For Azure use `az login` 


Install the dependencies 
>`npm install`

## Record Configuration
Record configuration is in `config` file.

Each entry in config file denotes the field in the record and the Faker functions which needs to be called. Its format is as below:-

Faker Namespace | Function | alias(This is the fieldname you get in JSON record) | One or more Function arguments

First two required fields are explained in readme of Faker project (link above)

"#" at the start will exclude the line.

## Execution

Below command generates one record each second for 1 min and writes them to port 4000 or PORT set in .env file. 
`npm start -- -i 1000 -t 1`

`nc localhost 4000` on separate terminal will show the generated data

See help
```
node index.js -h
or
npm start -- -h

Options:
  -i, --interval <interval>  Interval in milliseconds between records
  -t, --timeout <timeout>    Timeout in minutes for generator
  -n, --noeventtime          Flag to disable adding event time to records
  -p, --port <port>          Specify port for tcp server, default is 4000
  -c, --csv                  Create csv formatted records
  -h, --help                 display help for command

```
Interval and port  can be set in .env file as well. Commandline input(`optional`)  will overide this value.

Output is json formatted.
## Some Examples

### Output with eventtime
Config to generate sale records for Y number of items for X number of users

> ![example1.yaml](schema/example1.yaml)


```
{"user":3,"item":"itemC","quantity":7,"eventtime":1631377288497}
{"user":2,"item":"itemA","quantity":4,"eventtime":1631377290499}
{"user":1,"item":"itemC","quantity":10,"eventtime":1631377292499}
{"user":3,"item":"itemC","quantity":-5,"eventtime":1631377294502}
{"user":3,"item":"itemC","quantity":-2,"eventtime":1631377296504}
```

Below config generates temperature sensor data for 10 sensors
```
datatype|number|id|{"min":0,"max":10}
datatype|float|temp|{"min":20,"max":50}
```
### Sample output
```
{"id":2,"value":32.15}
{"id":4,"value":24.33}
{"id":3,"value":39.57}
{"id":4,"value":29.81}
```
Create employee data. Since this is random, it cannot gurantee duplicates or that employee will not have two joining dates.
```
datatype|number|id
name|firstName|firstName
name|lastName|lastName
internet|email|email
phone|phoneNumber|phone
date|past|joiningDate|5|01-01-2017
```
### Sample output 
```
{"id":3998,"firstName":"Melinda","lastName":"Robel","email":"Ashton_Tremblay29@yahoo.com","phone":"(490) 786-0551 x28738","joiningDate":"2012-09-12T08:50:54.989Z"}
{"id":53727,"firstName":"Kristin","lastName":"Baumbach","email":"Nolan.Bernier@hotmail.com","phone":"786-594-4418 x7232","joiningDate":"2012-03-29T03:20:47.244Z"}
{"id":76041,"firstName":"Krystal","lastName":"Sawayn","email":"Jaleel79@hotmail.com","phone":"(520) 411-6918 x52633","joiningDate":"2012-06-19T06:58:01.561Z"}
```
Create random text with 6 words on each line separated by single space 
```
lorem|words|textline|6
```
### Sample Output
```
{"textline":"et animi libero eos repudiandae sed"}
{"textline":"fuga molestiae est soluta porro molestias"}
{"textline":"laborum aliquam dolore unde placeat cum"}
{"textline":"magnam nisi quis hic dignissimos non"}
```