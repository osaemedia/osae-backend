import { Server, Socket } from 'socket.io';
import { prisma } from '../server';
import { decrypt } from '../utils/encryption';
import fs from 'fs';

export const setupSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', (room: string) => {
      if (room) {
        socket.join(room);
      }
    });

    socket.on('leave_room', (room: string) => {
      if (room) {
        socket.leave(room);
      }
    });

    socket.on('join_stream', (streamId: string) => {
      const room = `stream_${streamId}`;
      socket.join(room);
      socket.to(room).emit('viewer_joined', { streamId, socketId: socket.id });
    });

    socket.on('leave_stream', (streamId: string) => {
      const room = `stream_${streamId}`;
      socket.leave(room);
      socket.to(room).emit('viewer_left', { streamId, socketId: socket.id });
    });

    socket.on('broadcaster_start', (streamId: string) => {
      const room = `stream_${streamId}`;
      socket.join(room);
      socket.to(room).emit('broadcaster_started', { streamId });
    });

    socket.on('webrtc_offer', (data: any) => {
      const { targetSocketId, offer } = data;
      if (targetSocketId) {
        socket.to(targetSocketId).emit('webrtc_offer', { offer, from: socket.id });
      }
    });

    socket.on('webrtc_answer', (data: any) => {
      const { targetSocketId, answer } = data;
      if (targetSocketId) {
        socket.to(targetSocketId).emit('webrtc_answer', { answer, from: socket.id });
      }
    });

    socket.on('ice_candidate', (data: any) => {
      const { targetSocketId, candidate } = data;
      if (targetSocketId) {
        socket.to(targetSocketId).emit('ice_candidate', { candidate, from: socket.id });
      }
    });

    socket.on('live_comment', (data: any) => {
      const { streamId, comment, sender } = data;
      const room = `stream_${streamId}`;
      socket.to(room).emit('live_comment', { comment, sender, streamId });
    });

    socket.on('like_post', async (data: any) => {
      try {
        const { postOwnerId, postId, userId } = data;
        if (postOwnerId) {
          io.to(postOwnerId).emit('new_notification', {
            type: 'like',
            referenceId: postId,
            fromUserId: userId,
          });
        }
      } catch (error) {
        console.error('Error handling like_post:', error);
      }
    });

    socket.on('comment_post', async (data: any) => {
      try {
        const { postOwnerId, postId, userId, comment } = data;
        if (postOwnerId) {
          io.to(postOwnerId).emit('new_notification', {
            type: 'comment',
            referenceId: postId,
            fromUserId: userId,
            comment,
          });
        }
      } catch (error) {
        console.error('Error handling comment_post:', error);
      }
    });

    socket.on('send_message', async (data: any) => {
      try {
        const { receiverId, content, fileUrl, isViewOnce } = data;
        const decryptedContent = content ? decrypt(content) : null;

        const message = await prisma.message.create({
          data: {
            senderId: data.senderId,
            receiverId,
            content: decryptedContent,
            fileUrl,
            isViewOnce,
          },
          include: {
            sender: { select: { username: true, avatar: true } },
          },
        });

        io.to(receiverId).emit('receive_message', message);

        if (isViewOnce) {
          setTimeout(async () => {
            await prisma.message.delete({ where: { id: message.id } });
            if (fileUrl) {
              try {
                fs.unlinkSync(fileUrl);
              } catch (unlinkError) {
                console.error('File deletion error:', unlinkError);
              }
            }
          }, 10000);
        }
      } catch (error) {
        console.error('Error sending message:', error);
      }
    });

    socket.on('message_read', async (messageId: string) => {
      try {
        await prisma.message.update({
          where: { id: messageId },
          data: { readAt: new Date() },
        });
        socket.emit('message_read_ack', messageId);
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    socket.on('disconnecting', () => {
      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.leave(room);
        }
      });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};