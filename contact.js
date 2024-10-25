const express = require('express');
const router = express.Router();
const fs = require('fs');
const csv = require('csv-parser');
const { parse } = require('json2csv');
const xlsx = require('xlsx');
const multer = require('multer');
const { Contact } = require('../models');
const { validate, authenticateUser, contactSchema } = require('../middleware');

const upload = multer({ dest: 'uploads/' });

router.post('/', validate(contactSchema), authenticateUser, async (req, res) => {
    const { name, email, phone, address, timezone } = req.body;
    const newContact = await Contact.create({ name, email, phone, address, timezone, userId: req.userId });
    res.status(201).json(newContact);
});

router.get('/', authenticateUser, async (req, res) => {
    const { name, email, timezone, startDate, endDate } = req.query;
    const filters = { isDeleted: false };
    if (name) filters.name = new RegExp(name, 'i');
    if (email) filters.email = new RegExp(email, 'i');
    if (timezone) filters.timezone = timezone;
    if (startDate && endDate) {
        filters.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }
    const contacts = await Contact.findAll({ where: filters });
    res.json(contacts);
});

router.put('/:id', validate(contactSchema), authenticateUser, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const updatedContact = await Contact.findByPk(id);
    if (updatedContact) {
        updatedContact.update(updates);
        res.json(updatedContact);
    } else {
        res.status(404).json({ error: 'Contact not found' });
    }
});

router.delete('/:id', authenticateUser, async (req, res) => {
    const { id } = req.params;
    const deletedContact = await Contact.findByPk(id);
    if (deletedContact) {
        deletedContact.update({ isDeleted: true });
        res.json(deletedContact);
    } else {
        res.status(404).json({ error: 'Contact not found' });
    }
});

router.post('/upload/csv', authenticateUser, upload.single('file'), async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const results = [];
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => {
                const { error } = contactSchema.validate(data);
                if (error) throw new Error(error.details[0].message);
                results.push(data);
            })
            .on('end', async () => {
                await Contact.bulkCreate(results, { transaction });
                await transaction.commit();
                res.send('Contacts uploaded and validated successfully.');
            });
    } catch (error) {
        await transaction.rollback();
        res.status(400).send(error.message);
    }
});

router.get('/download/csv', authenticateUser, async (req, res) => {
    const contacts = await Contact.findAll({ where: { isDeleted: false } });
    const csv = parse(contacts);
    res.header('Content-Type', 'text/csv');
    res.attachment('contacts.csv');
    res.send(csv);
});

router.get('/download/excel', authenticateUser, async (req, res) => {
    const contacts = await Contact.findAll({ where: { isDeleted: false } });
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(contacts);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Contacts');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spread');