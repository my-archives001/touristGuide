// backend/scripts/fixImageUrls.js
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const Place = require('../models/placeModel');

const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');
const API_BASE = process.env.API_BASE || `http://localhost:${process.env.PORT || 5000}`;

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const files = fs.existsSync(IMAGES_DIR) ? fs.readdirSync(IMAGES_DIR) : [];
  const fileSet = new Set(files);

  const cursor = Place.find({ $or: [{ imageUrl: null }, { imageUrl: '' }, { imageUrl: { $exists: false } }] }).cursor();

  let updated = 0;
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    const id = doc._id.toString();
    const name = doc.name || '';
    const candidates = [];

    // check by exact filename candidates
    candidates.push(`${slugify(name)}.jpg`, `${slugify(name)}.jpeg`, `${slugify(name)}.png`);
    candidates.push(`${name}.jpg`, `${name}.jpeg`, `${name}.png`);
    candidates.push(`${id}.jpg`, `${id}.jpeg`, `${id}.png`);

    let found = null;
    for (const c of candidates) {
      if (fileSet.has(c)) { found = c; break; }
    }

    if (found) {
      const imageUrl = `${API_BASE}/images/${found}`;
      await Place.updateOne({ _id: doc._id }, { $set: { imageUrl } });
      console.log(`Updated ${doc._id} -> ${imageUrl}`);
      updated++;
      continue;
    }

    // if doc has binary image, use streaming endpoint
    if (doc.image && doc.image.data) {
      const imageUrl = `${API_BASE}/api/places/${id}/image`;
      await Place.updateOne({ _id: doc._id }, { $set: { imageUrl } });
      console.log(`Set stream URL for ${doc._id} -> ${imageUrl}`);
      updated++;
      continue;
    }

    // final fallback to placeholder
    const imageUrl = `${API_BASE}/images/placeholder.png`;
    await Place.updateOne({ _id: doc._id }, { $set: { imageUrl } });
    console.log(`No image found for ${doc._id}. Set placeholder.`);
    updated++;
  }

  console.log(`Done. Updated ${updated} documents.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
