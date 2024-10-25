const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');

const userSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
});

const contactSchema = Joi.object({
    name: Joi.string().min(3).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().min(10).required(),
    address: Joi.string().optional(),
    timezone: Joi.string().optional()
});

const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    next();
};

const authenticateUser = (req, res, next) => {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id; // Add userId to request object
    next();
};

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});

module.exports = { validate, authenticateUser, authLimiter, userSchema, contactSchema };
