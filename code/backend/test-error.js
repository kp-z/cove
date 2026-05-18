const { MessageNotFoundError } = require('./dist/application/services/message/message.errors.js');

const error = new MessageNotFoundError('test-id');
console.log('Error name:', error.name);
console.log('Error message:', error.message);
console.log('Error statusCode:', error.statusCode);
console.log('Error code:', error.code);
console.log('Is AppError:', error.constructor.name);
console.log('Prototype chain:', Object.getPrototypeOf(error).constructor.name);
