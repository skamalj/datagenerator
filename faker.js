// Faker github page - https://github.com/faker-js/faker

var { faker }  = require('@faker-js/faker');

class Custom {
    randomElement(list) {
        return (faker.helpers.shuffle(list))[0]
    }
}

faker.custom = new Custom() 
module.exports = { faker };
