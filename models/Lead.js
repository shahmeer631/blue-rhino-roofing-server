import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    roofType: {
      type: String,
      required: [true, 'Roof type is required'],
      enum: ['Asphalt Shingles', 'Metal', 'Tile', 'Flat/TPO', 'Slate', 'Wood Shake', 'Other'],
    },
    damageType: {
      type: String,
      required: [true, 'Damage type is required'],
      enum: ['Storm Damage', 'Hail Damage', 'Wind Damage', 'Leak/Water Damage', 'Missing Shingles', 'Complete Replacement', 'New Installation', 'Other'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    source: {
      type: String,
      enum: ['estimate-form', 'chatbot', 'contact-page'],
      default: 'estimate-form',
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'closed'],
      default: 'new',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Lead', leadSchema);
