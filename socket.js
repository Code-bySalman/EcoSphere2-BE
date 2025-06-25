import { Server as SocketIOServer } from 'socket.io';
import Message from './models/MessageModel.js';
import Channel from './models/Channel.js';

const setUpSocket = server => {
  const allowedOrigins =
    process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];

  const io = new SocketIOServer(server, {
    cors: {
      origin: (origin, cb) =>
        !origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error('CORS')),
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  const userSocketMap = new Map();

  const disconnect = socket => {
    for (const [uid, sid] of userSocketMap.entries()) {
      if (sid === socket.id) {
        userSocketMap.delete(uid);
        break;
      }
    }
  };

  const sendChannelMessage = async msg => {
    const { channelId, sender, contents, messageType, fileUrl, tempClientMessageId } = msg;

    const created = await Message.create({
      sender,
      channelId,
      messageType,
      ...(messageType === 'text' ? { contents } : {}),
      ...(messageType === 'file' ? { fileUrl } : {}),
    });

    const data = await Message.findById(created._id)
      .populate('sender', 'id email name image color')
      .lean();

    await Channel.findByIdAndUpdate(channelId, { $push: { messages: created._id } });

    const channel = await Channel.findById(channelId).populate('members admin');
    const payload = { ...data, channelId, tempClientMessageId };

    channel.members.forEach(m => {
      const sid = userSocketMap.get(m._id.toString());
      if (sid) io.to(sid).emit('receive-channel-message', payload);
    });

    const adminSid = userSocketMap.get(channel.admin._id.toString());
    if (adminSid) io.to(adminSid).emit('receive-channel-message', payload);
  };

  const sendMessage = async msg => {
    const senderSid = userSocketMap.get(msg.sender);
    const recipientSid = userSocketMap.get(msg.recipient);

    const created = await Message.create({
      sender: msg.sender,
      recipient: msg.recipient,
      messageType: msg.messageType,
      ...(msg.messageType === 'text' ? { contents: msg.contents } : {}),
      ...(msg.messageType === 'file' ? { fileUrl: msg.fileUrl } : {}),
    });

    const data = await Message.findById(created._id)
      .populate('sender', 'id email name image color')
      .populate('recipient', 'id email name image color')
      .lean();

    const payload = { ...data, tempClientMessageId: msg.tempClientMessageId };

    if (recipientSid) io.to(recipientSid).emit('recieveMessage', payload);
    if (senderSid) io.to(senderSid).emit('recieveMessage', payload);
  };

  io.on('connection', socket => {
    const userId = socket.handshake.query.userId;
    if (userId) userSocketMap.set(userId, socket.id);

    socket.on('sendMessage', sendMessage);
    socket.on('send-channel-message', sendChannelMessage);
    socket.on('disconnect', () => disconnect(socket));
  });
};

export default setUpSocket;
