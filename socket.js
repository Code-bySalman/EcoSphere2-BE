import { Server as SocketIOServer } from 'socket.io';
import Message from './models/MessageModel.js';
import Channel from './models/Channel.js';

const setUpSocket = (server) => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  const userSocketMap = new Map();

  const disconnect = (socket) => {
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        break;
      }
    }
  };

  const sendChannelMessage = async (message) => {
    try {
      const { channelId, sender, contents, messageType, fileUrl, tempClientMessageId } = message;

      const createdMessage = await Message.create({
        sender,
        channelId,
        messageType,
        ...(messageType === 'text' ? { contents } : {}),
        ...(messageType === 'file' ? { fileUrl } : {}),
      });

      const messageData = await Message.findById(createdMessage._id)
        .populate('sender', 'id email firstName lastName image color')
        .lean();

      await Channel.findByIdAndUpdate(channelId, { $push: { messages: createdMessage._id } });

      const channel = await Channel.findById(channelId).populate('members admin');

      const finalData = { ...messageData, channelId, tempClientMessageId };

      if (channel && channel.members) {
        channel.members.forEach((member) => {
          const memberSocketId = userSocketMap.get(member._id.toString());
          if (memberSocketId) io.to(memberSocketId).emit('receive-channel-message', finalData);
        });
        const adminSocketId = userSocketMap.get(channel.admin._id.toString());
        if (adminSocketId) io.to(adminSocketId).emit('receive-channel-message', finalData);
      }
    } catch (err) {
      console.error('[Socket] Error saving channel message:', err);
    }
  };

  const sendMessage = async (message) => {
    try {
      const senderSocketId = userSocketMap.get(message.sender);
      const recipientSocketId = userSocketMap.get(message.recipient);

      const dbMessage = {
        sender: message.sender,
        recipient: message.recipient,
        messageType: message.messageType,
        ...(message.messageType === 'text' ? { contents: message.contents } : {}),
        ...(message.messageType === 'file' ? { fileUrl: message.fileUrl } : {}),
      };

      const createdMessage = await Message.create(dbMessage);

      const messageData = await Message.findById(createdMessage._id)
        .populate('sender', 'id email name image color')
        .populate('recipient', 'id email name image color')
        .lean();

      const emittedMessageData = { ...messageData, tempClientMessageId: message.tempClientMessageId };

      if (recipientSocketId) io.to(recipientSocketId).emit('recieveMessage', emittedMessageData);
      if (senderSocketId) io.to(senderSocketId).emit('recieveMessage', emittedMessageData);
    } catch (error) {
      console.error('Failed to save message or emit:', error);
    }
  };

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) userSocketMap.set(userId, socket.id);

    socket.on('sendMessage', sendMessage);
    socket.on('send-channel-message', sendChannelMessage);
    socket.on('disconnect', () => disconnect(socket));
  });
};

export default setUpSocket;
