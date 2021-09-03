Data generator based on [faker nodejs library](https://github.com/Marak/faker.js)

Install the dependencies and then update config file. 

Each entry in config file denotes the field in the record and the Faker functions which needs to be called. Its format is as below:-

Faker Namespace | Function | alias(This is the fieldname you get in JSON record) | One or more Function arguments

"#" at the start will exclude the line.

## Execution
node index.js `<interval in ms between records> <listen port>`

Below command generates one record each second and writes them to port 4000. `nc localhost 4000` will show the generated data
```
node index.js 1000  4000
```

Output is json formatted.
## Some Examples

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