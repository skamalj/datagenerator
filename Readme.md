Data generator based on [faker nodejs library](https://github.com/Marak/faker.js)

Install the dependencies and then update config file. 

Each entry in config file denotes the field in the record and the Faker functions which needs to be called. Its format is as below:-

Faker Namespace | Function | alias(This is the fieldname you get in JSON record) | One or more Function arguments

"#" at the start will exclude the line.

Output is json formatted.

>datatype|number|id|{"min":0,"max":10}
>datatype|float|temp|{"min":20,"max":50}

Create employee data. Since this is random, it cannot gurantee duplicates or that employee will not have two joining dates.
>datatype|number|id
>name|firstName|firstName
>name|lastName|lastName
>internet|email|email
>phone|phoneNumber|phone
>date|past|joiningDate|5|01-01-2017

Create random text with 6 words on each line separated by single space 
>lorem|words|textline|6