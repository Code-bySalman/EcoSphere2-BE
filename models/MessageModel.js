import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    messageType: {
      type: String,
      enum: ['text', 'file'],
      required: true,
    },
    contents: {
      type: String,
      trim: true,
      required() {
        return this.messageType === 'text';
      },
    },
    fileUrl: {
      type: String,
      required() {
        return this.messageType === 'file';
      },
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
    },
  },
  { timestamps: true }
);

messageSchema.pre('validate', function (next) {
  const hasRecipient = !!this.recipient;
  const hasChannel = !!this.channelId;

  if (hasRecipient === hasChannel) {
    return next(
      new Error(
        'Message must target exactly one destination: recipient (DM) OR channelId (group).'
      )
    );
  }
  next();
});

export default mongoose.model('Message', messageSchema);
