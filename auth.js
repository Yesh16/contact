const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { User } = require('../models');
const { validate, userSchema, authLimiter } = require('../middleware');

router.post('/register', authLimiter, validate(userSchema), async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ email, password: hashedPassword });
    const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET);
    res.status(201).json({ message: 'User registered. Verify your email!' });
});

router.post('/login', authLimiter, validate(userSchema), async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
    res.json({ token });
});

module.exports = router;
