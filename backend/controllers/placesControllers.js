const Place = require('../models/placeModel');
const { HTTP_STATUS, VALIDATION_LIMITS, MESSAGES } = require('../config');

// Fetch all places (with pagination support)
exports.getAllPlaces = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || VALIDATION_LIMITS.DEFAULT_PAGE;
    const limit = parseInt(req.query.limit) || VALIDATION_LIMITS.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const totalCount = await Place.countDocuments();
    const places = await Place.find({}, '-image.data')
      .lean()
      .skip(skip)
      .limit(limit);

    const host = req.get('host');
    const protocol = req.protocol;

    // Ensure each place has a valid imageUrl
    const mapped = places.map((p) => {
      if (p.image && p.image.contentType) {
        p.imageUrl = `${protocol}://${host}/api/places/${p._id}/image`;
      } else if (p.imageUrl) {
        // leave as-is (points to /images/... or external)
      } else {
        p.imageUrl = `${protocol}://${host}/images/placeholder.png`;
      }
      return p;
    });

    res.status(HTTP_STATUS.OK).json(mapped);
  } catch (err) {
    console.error('Error fetching places:', err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.SERVER_ERROR });
  }
};

// Fetch image by place ID (stream binary or redirect to stored URL)
exports.getPlaceImage = async (req, res) => {
  try {
    const place = await Place.findById(req.params.id).lean();
    if (!place) return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Place not found' });

    if (place.image && place.image.data) {
      const contentType = place.image.contentType || 'image/jpeg';
      res.set('Content-Type', contentType);
      const imgData = place.image.data.buffer
        ? Buffer.from(place.image.data.buffer)
        : place.image.data;
      return res.send(imgData);
    }

    if (place.imageUrl) {
      return res.redirect(place.imageUrl);
    }

    return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Image not found' });
  } catch (err) {
    console.error('Error fetching image:', err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.SERVER_ERROR });
  }
};
