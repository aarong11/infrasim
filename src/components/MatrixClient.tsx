'use client';
import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Users, Plus, Hash, Settings, Volume2, Mic, Crown, Shield, User, MoreVertical, Ban, MessageSquare, Info, UserMinus } from 'lucide-react';
import { MatrixAuthService, MatrixUser } from '@/services/matrix-auth-service';
import { JWTAuthService } from '@/services/jwt-auth-service';
import { SendTransactionModal } from '@/components/SendTransactionModal';

interface MatrixRoom {
  id: string;
  name: string;
  displayName: string;
  memberCount?: number;
  unreadCount?: number;
  isDM?: boolean;
  latestMessage?: {
    body: string;
    timestamp: number;
    sender: string;
  } | null;
  type?: 'group' | 'dm';
  otherUserId?: string;
}

interface MatrixMessage {
  event_id: string;
  sender: string;
  content: {
    body: string;
    msgtype: string;
  };
  origin_server_ts: number;
  type: string;
}

interface RoomMember {
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  membership: string;
  power_level?: number;
  wallet_address?: string;
}

interface MatrixClientProps {
  userId?: string;
  accessToken?: string;
  baseUrl?: string;
}

interface UserContextMenu {
  isOpen: boolean;
  x: number;
  y: number;
  user: RoomMember | null;
}

interface UserProfileModal {
  isOpen: boolean;
  user: RoomMember | null;
}

export const MatrixClient: React.FC<MatrixClientProps> = ({ 
  userId: externalUserId, 
  accessToken: externalAccessToken, 
  baseUrl = 'http://localhost:8008' 
}) => {
  const [user, setUser] = useState<MatrixUser | null>(null);
  const [rooms, setRooms] = useState<MatrixRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<MatrixMessage[]>([]);
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [showUserList, setShowUserList] = useState(true);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [matrixAuthService] = useState(() => MatrixAuthService.getInstance());
  const [jwtAuthService] = useState(() => JWTAuthService.getInstance());
  const [userContextMenu, setUserContextMenu] = useState<UserContextMenu>({
    isOpen: false,
    x: 0,
    y: 0,
    user: null
  });
  const [userProfileModal, setUserProfileModal] = useState<UserProfileModal>({
    isOpen: false,
    user: null
  });
  const [sendTransactionModal, setSendTransactionModal] = useState({
    isOpen: false,
    recipientAddress: '',
    recipientName: ''
  });

  useEffect(() => {
    if (externalUserId && externalAccessToken) {
      // Get the wallet address from the JWT auth service
      const walletAddress = jwtAuthService.getWalletAddress();
      
      setUser({
        accessToken: externalAccessToken,
        userId: externalUserId,
        deviceId: 'external_device',
        displayName: externalUserId.split(':')[0].replace('@', ''),
        walletAddress: walletAddress || ''
      });
      loadRooms();
    }
  }, [externalUserId, externalAccessToken, jwtAuthService]);

  const matrixApi = async (action: string, params: any = {}) => {
    const response = await fetch('/api/matrix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, baseUrl, ...params }),
    });
    return response.json();
  };

  const loadRooms = async () => {
    try {
      setAuthError(null);
      
      const [groupRoomsResponse, dmsResponse] = await Promise.all([
        matrixAuthService.authenticatedFetch('/api/matrix/rooms'),
        matrixAuthService.authenticatedFetch('/api/matrix/dms')
      ]);

      const roomList: MatrixRoom[] = [];

      if (groupRoomsResponse.ok) {
        const groupRoomsData = await groupRoomsResponse.json();
        if (groupRoomsData.success) {
          const groupRooms = groupRoomsData.groupChats.map((room: any) => ({
            id: room.roomId,
            name: room.roomId,
            displayName: room.name,
            memberCount: room.memberCount,
            latestMessage: room.latestMessage,
            unreadCount: 0,
            isDM: false,
            type: 'group'
          }));
          roomList.push(...groupRooms);
        }
      }

      if (dmsResponse.ok) {
        const dmsData = await dmsResponse.json();
        if (dmsData.success) {
          const directMessages = dmsData.directMessages.map((dm: any) => ({
            id: dm.roomId,
            name: dm.roomId,
            displayName: dm.name,
            memberCount: dm.memberCount || 2,
            latestMessage: dm.latestMessage,
            unreadCount: 0,
            isDM: true,
            type: 'dm',
            otherUserId: dm.otherUserId
          }));
          roomList.push(...directMessages);
        }
      }

      setRooms(roomList);
    } catch (error) {
      console.error('Failed to load rooms:', error);
      
      if (error instanceof Error && error.message.includes('authentication')) {
        setAuthError('Matrix authentication expired. Please reconnect to Matrix.');
        return;
      }

      try {
        if (!user?.accessToken) return;
        
        const channelsResult = await matrixApi('getRooms', { accessToken: user.accessToken });
        const dmsResult = await matrixApi('getDirectMessages', { accessToken: user.accessToken });
        
        const roomList = [];
        
        if (channelsResult.success) {
          const channelPromises = channelsResult.rooms.map(async (roomId: string) => {
            try {
              const roomNameResult = await matrixApi('getRoomName', { roomId, accessToken: user.accessToken });
              const displayName = roomNameResult.success && roomNameResult.name 
                ? roomNameResult.name 
                : roomId.split(':')[0].replace('!', '').substring(0, 12) + '...';
              
              return {
                id: roomId,
                name: roomId,
                displayName: displayName,
                unreadCount: 0,
                isDM: false,
                memberCount: 0,
                type: 'group'
              };
            } catch (error) {
              return {
                id: roomId,
                name: roomId,
                displayName: `Room ${roomId.substring(1, 8)}...`,
                unreadCount: 0,
                isDM: false,
                memberCount: 0,
                type: 'group'
              };
            }
          });
          
          const channels = await Promise.all(channelPromises);
          roomList.push(...channels);
        }
        
        if (dmsResult.success) {
          const dms = dmsResult.directMessages.map((dm: any) => ({
            id: dm.roomId,
            name: dm.roomId,
            displayName: dm.displayName,
            unreadCount: 0,
            isDM: true,
            memberCount: 2,
            type: 'dm'
          }));
          
          roomList.push(...dms);
        }
        
        setRooms(roomList);
      } catch (fallbackError) {
        console.error('Fallback API also failed:', fallbackError);
        setAuthError('Failed to load Matrix rooms. Please try reconnecting.');
      }
    }
  };

  const loadRoomMembers = async (roomId: string) => {
    if (!user) return;
    try {
      const result = await matrixApi('getRoomMembers', {
        roomId,
        accessToken: user.accessToken,
      });
      if (result.success) {
        setRoomMembers(result.members || []);
      }
    } catch (error) {
      console.error('Failed to load room members:', error);
      setRoomMembers([
        {
          user_id: user.userId,
          display_name: getSenderDisplayName(user.userId),
          membership: 'join',
          power_level: 100
        },
        {
          user_id: '@alice:localhost',
          display_name: 'Alice',
          membership: 'join',
          power_level: 50
        },
        {
          user_id: '@bob:localhost',
          display_name: 'Bob',
          membership: 'join',
          power_level: 0
        }
      ]);
    }
  };

  const loadMessages = async (roomId: string) => {
    if (!user) return;
    try {
      const result = await matrixApi('getMessages', {
        roomId,
        accessToken: user.accessToken,
      });
      if (result.success) {
        const filteredMessages = result.messages.filter((msg: MatrixMessage) => 
          msg.type === 'm.room.message' && 
          msg.content && 
          msg.content.msgtype === 'm.text' &&
          msg.content.body &&
          !msg.content.body.startsWith('**')
        );
        setMessages(filteredMessages.reverse().slice(-50));
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!user || !selectedRoom || !newMessage.trim()) return;
    
    try {
      const result = await matrixApi('sendMessage', {
        roomId: selectedRoom,
        message: newMessage,
        accessToken: user.accessToken,
      });
      if (result.success) {
        setNewMessage('');
        loadMessages(selectedRoom);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const createRoom = async () => {
    if (!user || !newRoomName.trim()) return;
    
    try {
      const result = await matrixApi('createRoom', {
        name: newRoomName,
        topic: `InfraSim discussion: ${newRoomName}`,
        accessToken: user.accessToken,
      });
      if (result.success) {
        setNewRoomName('');
        loadRooms();
      }
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom);
      loadRoomMembers(selectedRoom);
    }
  }, [selectedRoom]);

  const getSenderDisplayName = (sender: string) => {
    if (sender === user?.userId) return 'You';
    const member = roomMembers.find(m => m.user_id === sender);
    if (member?.display_name) return member.display_name;
    return sender.split(':')[0].replace('@', '');
  };

  const getSelectedRoomName = () => {
    const room = rooms.find(r => r.id === selectedRoom);
    return room ? room.displayName : 'Unknown Room';
  };

  const getUserRoleIcon = (member: RoomMember) => {
    if (member.power_level >= 100) return <Crown className="w-3 h-3 text-yellow-400" />;
    if (member.power_level >= 50) return <Shield className="w-3 h-3 text-blue-400" />;
    return null;
  };

  const getUserStatusColor = (member: RoomMember) => {
    if (member.membership === 'join') return 'bg-green-500';
    if (member.membership === 'invite') return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const handleUserContextMenu = (event: React.MouseEvent, member: RoomMember) => {
    event.preventDefault();
    event.stopPropagation();
    
    setUserContextMenu({
      isOpen: true,
      x: event.clientX,
      y: event.clientY,
      user: member
    });
  };

  const handleSendDirectMessage = async (targetUser: RoomMember) => {
    if (!user) return;
    
    try {
      const result = await matrixApi('createDirectRoom', {
        targetUserId: targetUser.user_id,
        accessToken: user.accessToken,
      });
      
      if (result.success) {
        loadRooms();
        setSelectedRoom(result.roomId);
        setUserContextMenu(prev => ({ ...prev, isOpen: false }));
      }
    } catch (error) {
      console.error('Failed to create direct message room:', error);
    }
  };

  const handleBlockUser = async (targetUser: RoomMember) => {
    if (!user) return;
    
    try {
      const result = await matrixApi('blockUser', {
        targetUserId: targetUser.user_id,
        accessToken: user.accessToken,
      });
      
      if (result.success) {
        console.log('User blocked successfully');
        setUserContextMenu(prev => ({ ...prev, isOpen: false }));
        if (selectedRoom) {
          loadRoomMembers(selectedRoom);
        }
      }
    } catch (error) {
      console.error('Failed to block user:', error);
    }
  };

  const handleKickUser = async (targetUser: RoomMember) => {
    if (!user || !selectedRoom) return;
    
    try {
      const result = await matrixApi('kickUser', {
        roomId: selectedRoom,
        targetUserId: targetUser.user_id,
        reason: 'Kicked by moderator',
        accessToken: user.accessToken,
      });
      
      if (result.success) {
        console.log('User kicked successfully');
        setUserContextMenu(prev => ({ ...prev, isOpen: false }));
        loadRoomMembers(selectedRoom);
      }
    } catch (error) {
      console.error('Failed to kick user:', error);
    }
  };

  const handleViewProfile = (targetUser: RoomMember) => {
    setUserContextMenu(prev => ({ ...prev, isOpen: false }));
    setUserProfileModal({
      isOpen: true,
      user: targetUser
    });
  };

  const closeProfileModal = () => {
    setUserProfileModal({
      isOpen: false,
      user: null
    });
  };

  const handleSendFunds = (targetUser: RoomMember) => {
    const walletAddress = targetUser.wallet_address || targetUser.user_id; // Fallback to user ID if no wallet address
    setSendTransactionModal({
      isOpen: true,
      recipientAddress: walletAddress,
      recipientName: targetUser.display_name || targetUser.user_id.split(':')[0].replace('@', '')
    });
    closeProfileModal();
  };

  const handleTransactionComplete = (txHash: string) => {
    console.log('Transaction completed:', txHash);
    // You could show a notification or refresh balances here
  };

  const formatJoinDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRoleDisplayName = (powerLevel?: number) => {
    if (!powerLevel) return 'Member';
    if (powerLevel >= 100) return 'Administrator';
    if (powerLevel >= 50) return 'Moderator';
    return 'Member';
  };

  const getRoleColor = (powerLevel?: number) => {
    if (!powerLevel) return 'text-gray-400';
    if (powerLevel >= 100) return 'text-yellow-400';
    if (powerLevel >= 50) return 'text-blue-400';
    return 'text-gray-400';
  };

  const canModerate = (targetUser: RoomMember): boolean => {
    if (!user) return false;
    const currentUserMember = roomMembers.find(m => m.user_id === user.userId);
    const currentUserPowerLevel = currentUserMember?.power_level || 0;
    const targetPowerLevel = targetUser.power_level || 0;
    return currentUserPowerLevel > targetPowerLevel && currentUserPowerLevel >= 50;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userContextMenu.isOpen) {
        setUserContextMenu(prev => ({ ...prev, isOpen: false }));
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [userContextMenu.isOpen]);

  if (!user) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto">
        <div className="flex items-center mb-4">
          <MessageCircle className="w-6 h-6 text-blue-400 mr-2" />
          <h2 className="text-xl font-bold text-white">Matrix Chat</h2>
        </div>
        <div className="text-gray-400">
          Please authenticate with your wallet to access Matrix chat.
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto">
        <div className="flex items-center mb-4">
          <MessageCircle className="w-6 h-6 text-red-400 mr-2" />
          <h2 className="text-xl font-bold text-white">Matrix Authentication Error</h2>
        </div>
        <div className="text-red-400 mb-4">
          {authError}
        </div>
        <button
          onClick={() => {
            setAuthError(null);
            loadRooms();
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden h-[calc(100vh-30px)] flex">
      <div className="w-72 bg-gray-900 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold">InfraSim Matrix</h2>
            <Settings className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 py-1">
              Channels
            </div>
            <div className="space-y-0.5">
              {rooms.filter(room => !room.isDM).map(room => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id)}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors group flex items-center justify-between ${
                    selectedRoom === room.id 
                      ? 'bg-gray-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-700 hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center min-w-0">
                    <Hash className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{room.displayName}</span>
                  </div>
                  {room.unreadCount > 0 && (
                    <div className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                      {room.unreadCount}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {rooms.some(room => room.isDM) && (
            <div className="p-2 border-t border-gray-700">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 py-1">
                Direct Messages
              </div>
              <div className="space-y-0.5">
                {rooms.filter(room => room.isDM).map(room => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors group flex items-center justify-between ${
                      selectedRoom === room.id 
                        ? 'bg-gray-600 text-white' 
                        : 'text-gray-300 hover:bg-gray-700 hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center min-w-0">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3 flex-shrink-0" />
                      <span className="truncate">{room.displayName}</span>
                    </div>
                    {room.unreadCount > 0 && (
                      <div className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                        {room.unreadCount}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-2 border-t border-gray-700">
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Create channel..."
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createRoom()}
                className="w-full bg-gray-700 text-white px-3 py-1.5 rounded text-sm border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-400"
              />
              <button
                onClick={createRoom}
                disabled={!newRoomName.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white py-1.5 px-3 rounded text-sm flex items-center justify-center transition-colors"
              >
                <Plus className="w-3 h-3 mr-1" />
                Create Channel
              </button>
            </div>
          </div>
        </div>

        <div className="p-2 border-t border-gray-700 bg-gray-800">
          <div className="flex items-center justify-between bg-gray-700 rounded px-2 py-1">
            <div className="flex items-center min-w-0">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-2">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-white text-sm font-medium truncate">
                  {getSenderDisplayName(user.userId)}
                </div>
                <div className="text-gray-400 text-xs truncate">
                  Online
                </div>
              </div>
            </div>
            <div className="flex space-x-1">
              <Mic className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" />
              <Volume2 className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" />
              <Settings className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-gray-700">
        {selectedRoom ? (
          <>
            <div className="px-4 py-3 border-b border-gray-600 bg-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Hash className="w-5 h-5 text-gray-400 mr-2" />
                  <h3 className="text-white font-semibold">{getSelectedRoomName()}</h3>
                  <span className="mx-2 text-gray-500">|</span>
                  <span className="text-gray-400 text-sm">
                    Welcome to #{getSelectedRoomName()}!
                  </span>
                </div>
                <button
                  onClick={() => setShowUserList(!showUserList)}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <Users className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto p-4">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <div className="text-center">
                        <Hash className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                        <h3 className="text-xl font-semibold mb-2 text-white">
                          Welcome to #{getSelectedRoomName()}!
                        </h3>
                        <p className="text-gray-400">This is the beginning of the #{getSelectedRoomName()} channel.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message, index) => {
                        const isOwn = message.sender === user.userId;
                        const member = roomMembers.find(m => m.user_id === message.sender);
                        
                        return (
                          <div key={message.event_id} className="flex items-start space-x-3 hover:bg-gray-600/20 p-2 rounded">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className={`font-semibold text-sm ${
                                  isOwn ? 'text-blue-400' : 'text-white'
                                }`}>
                                  {getSenderDisplayName(message.sender)}
                                </span>
                                {member && getUserRoleIcon(member)}
                                <span className="text-xs text-gray-400">
                                  {new Date(message.origin_server_ts).toLocaleString()}
                                </span>
                              </div>
                              <div className="text-gray-100 text-sm leading-relaxed">
                                {message.content.body}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder={`Message #${getSelectedRoomName()}`}
                      className="w-full bg-gray-600 text-white px-4 py-3 rounded-lg border-none focus:outline-none placeholder-gray-400"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-white disabled:text-gray-600 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {showUserList && (
                <div className="w-60 bg-gray-800 border-l border-gray-600">
                  <div className="p-3 border-b border-gray-600">
                    <div className="text-white font-semibold text-sm">
                      Members — {roomMembers.filter(m => m.membership === 'join').length}
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    <div className="p-2">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 py-1">
                        Online — {roomMembers.filter(m => m.membership === 'join').length}
                      </div>
                      <div className="space-y-1">
                        {roomMembers
                          .filter(member => member.membership === 'join')
                          .sort((a, b) => (b.power_level || 0) - (a.power_level || 0))
                          .map(member => (
                            <div
                              key={member.user_id}
                              className="flex items-center px-2 py-1 rounded hover:bg-gray-700 cursor-pointer group"
                              onContextMenu={(e) => handleUserContextMenu(e, member)}
                              onClick={(e) => {
                                // Allow viewing own profile too
                                handleUserContextMenu(e, member);
                              }}
                            >
                              <div className="relative">
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                                  <User className="w-4 h-4 text-white" />
                                </div>
                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-800 ${getUserStatusColor(member)}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-1">
                                  <span className={`text-sm font-medium truncate ${
                                    member.user_id === user.userId ? 'text-blue-400' : 'text-white'
                                  }`}>
                                    {member.display_name || member.user_id.split(':')[0].replace('@', '')}
                                  </span>
                                  {getUserRoleIcon(member)}
                                </div>
                                {member.power_level >= 50 && (
                                  <div className="text-xs text-gray-400">
                                    {member.power_level >= 100 ? 'Admin' : 'Moderator'}
                                  </div>
                                )}
                              </div>
                              {member.user_id !== user?.userId && (
                                <MoreVertical className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-700">
            <div className="text-center">
              <Hash className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold mb-2 text-white">Welcome to InfraSim Matrix</h3>
              <p className="text-gray-400">Select a channel to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* User Context Menu */}
      {userContextMenu.isOpen && userContextMenu.user && (
        <div
          className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{
            left: `${userContextMenu.x}px`,
            top: `${userContextMenu.y}px`,
          }}
        >
          <button
            onClick={() => handleViewProfile(userContextMenu.user!)}
            className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 flex items-center"
          >
            <Info className="w-4 h-4 mr-2" />
            View Profile
          </button>
          
          {userContextMenu.user.user_id !== user?.userId && (
            <button
              onClick={() => handleSendDirectMessage(userContextMenu.user!)}
              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 flex items-center"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Send Message
            </button>
          )}
          
          <div className="border-t border-gray-600 my-1" />
          
          {canModerate(userContextMenu.user) && (
            <>
              <button
                onClick={() => handleKickUser(userContextMenu.user!)}
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center"
              >
                <UserMinus className="w-4 h-4 mr-2" />
                Kick User
              </button>
            </>
          )}
          
          {userContextMenu.user.user_id !== user?.userId && (
            <button
              onClick={() => handleBlockUser(userContextMenu.user!)}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center"
            >
              <Ban className="w-4 h-4 mr-2" />
              Block User
            </button>
          )}
        </div>
      )}

      {/* User Profile Modal */}
      {userProfileModal.isOpen && userProfileModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">User Profile</h3>
              <button
                onClick={closeProfileModal}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">
                    {userProfileModal.user.display_name || 
                     userProfileModal.user.user_id.split(':')[0].replace('@', '')}
                  </h4>
                  <p className="text-gray-400 text-sm">{userProfileModal.user.user_id}</p>
                  <div className={`text-sm font-medium ${getRoleColor(userProfileModal.user.power_level)}`}>
                    {getRoleDisplayName(userProfileModal.user.power_level)}
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-600 pt-4">
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-400">Status:</span>
                      <div className="text-white capitalize">{userProfileModal.user.membership}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Joined:</span>
                      <div className="text-white">{formatJoinDate()}</div>
                    </div>
                  </div>
                  
                  {(userProfileModal.user.wallet_address || (userProfileModal.user.user_id === user?.userId && user?.walletAddress)) && (
                    <div>
                      <span className="text-gray-400">Wallet Address:</span>
                      <div className="text-white font-mono text-xs break-all bg-gray-700 p-2 rounded mt-1">
                        {userProfileModal.user.wallet_address || user?.walletAddress}
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(userProfileModal.user.wallet_address || user?.walletAddress || '')}
                        className="text-blue-400 hover:text-blue-300 text-xs mt-1 transition-colors"
                      >
                        Copy Address
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-2 pt-4">
                {userProfileModal.user.user_id !== user?.userId && (
                  <button
                    onClick={() => {
                      handleSendDirectMessage(userProfileModal.user!);
                      closeProfileModal();
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors flex items-center justify-center"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Message
                  </button>
                )}
                
                {canModerate(userProfileModal.user) && (
                  <button
                    onClick={() => {
                      handleKickUser(userProfileModal.user!);
                      closeProfileModal();
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
                  >
                    Kick
                  </button>
                )}

                {userProfileModal.user.user_id !== user?.userId && userProfileModal.user.wallet_address && (
                  <button
                    onClick={() => handleSendFunds(userProfileModal.user!)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send Funds
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Transaction Modal */}
      {sendTransactionModal.isOpen && (
        <SendTransactionModal
          isOpen={sendTransactionModal.isOpen}
          recipientAddress={sendTransactionModal.recipientAddress}
          recipientName={sendTransactionModal.recipientName}
          onClose={() => setSendTransactionModal({ isOpen: false, recipientAddress: '', recipientName: '' })}
          onTransactionComplete={handleTransactionComplete}
        />
      )}
    </div>
  );
};