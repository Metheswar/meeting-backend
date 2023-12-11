
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const cors = require('cors');
const app = express();
const port = 3001;

const sequelize = new Sequelize('metheswar', 'root', 'Methi@2304', {
  host: 'localhost',
  dialect: 'mysql',
});

const Meeting = sequelize.define('Meeting', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  timing: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

const Slot = sequelize.define('Slot', {
  timing: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  count: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

const initializeSlots = async () => {
  try {
    const existingSlots = await Slot.findAll();

    if (existingSlots.length === 0) {
      const defaultSlots = [
        { timing: '4pm', count: 4 },
        { timing: '5pm', count: 4 },
        { timing: '6pm', count: 4 },
        { timing: '7pm', count: 4 },
      ];

      await Slot.bulkCreate(defaultSlots, { ignoreDuplicates: true });
      console.log('Default slots inserted successfully.');
    } else {
      console.log('Slots table is not empty. Skipping default slot insertion.');
    }
  } catch (error) {
    console.error('Error initializing slots:', error);
  }
};

app.use(cors());
sequelize.sync();
app.use(express.json());

initializeSlots();

app.get('/slots', async (req, res) => {
  try {
    const availableSlots = await Slot.findAll({ where: { count: { [Sequelize.Op.gt]: 0 } } });
    res.status(200).json(availableSlots);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/slot', async (req, res) => {
  const timing = req.body.timing;
  const slotLeft = await Slot.findOne({ where: { timing } });
  res.json({ slotLeft });
});

app.post('/schedule-meeting', async (req, res) => {
  try {
    const { name, email, timing } = req.body;

    const slot = await Slot.findOne({ where: { timing } });
    if (!slot || slot.count === 0) {
      return res.status(400).json({ error: 'No slots left at this timing.' });
    }

    const newMeeting = await Meeting.create({
      name,
      email,
      timing,
    });

    await Slot.update({ count: sequelize.literal('count - 1') }, { where: { timing } });

    res.status(201).json({ message: 'Meeting scheduled successfully!', meeting: newMeeting });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/meetings', async (req, res) => {
  try {
    const meetings = await Meeting.findAll();
    res.status(200).json(meetings);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
