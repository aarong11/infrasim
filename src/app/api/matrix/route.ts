import { NextRequest, NextResponse } from 'next/server';
import { getWalletAddressForMatrixUser, storeWalletAddressForMatrixUser } from '@/services/wallet-mapping-service';

interface MatrixLoginRequest {
  username: string;
  password: string;
}

interface MatrixSendMessageRequest {
  roomId: string;
  message: string;
  accessToken: string;
}

interface MatrixCreateRoomRequest {
  name: string;
  topic?: string;
  accessToken: string;
}

const MATRIX_BASE_URL = process.env.MATRIX_BASE_URL || 'http://matrix:8008';

// Helper function to handle Matrix authentication errors
async function handleMatrixAuthError(response: Response, accessToken: string) {
  if (response.status === 401 || response.status === 403) {
    // Token is invalid or expired
    return NextResponse.json({ 
      error: 'Matrix authentication expired',
      code: 'MATRIX_AUTH_EXPIRED',
      message: 'Please re-authenticate with Matrix'
    }, { status: 401 });
  }
  return null;
}

// Helper function to check if user info can be retrieved (token validity)
async function validateMatrixToken(accessToken: string) {
  try {
    const whoamiResponse = await fetch(`${MATRIX_BASE_URL}/_matrix/client/r0/account/whoami`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!whoamiResponse.ok) {
      const authError = await handleMatrixAuthError(whoamiResponse, accessToken);
      if (authError) return authError;
      
      return NextResponse.json({ 
        error: 'Failed to get user info',
        code: 'MATRIX_AUTH_FAILED'
      }, { status: 500 });
    }
    
    return await whoamiResponse.json();
  } catch (error) {
    console.error('Matrix token validation error:', error);
    return NextResponse.json({ 
      error: 'Matrix server unavailable',
      code: 'MATRIX_SERVER_ERROR'
    }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json();

    switch (action) {
      case 'login':
        return await handleLogin(params as MatrixLoginRequest);
      
      case 'sendMessage':
        return await handleSendMessage(params as MatrixSendMessageRequest);
      
      case 'createRoom':
        return await handleCreateRoom(params as MatrixCreateRoomRequest);
      
      case 'getRooms':
        return await handleGetRooms(params.accessToken);
      
      case 'getDirectMessages':
        return await handleGetDirectMessages(params.accessToken);
      
      case 'getMessages':
        return await handleGetMessages(params.roomId, params.accessToken);
      
      case 'getRoomName':
        return await handleGetRoomName(params.roomId, params.accessToken);
      
      case 'getRoomMembers':
        return await handleGetRoomMembers(params.roomId, params.accessToken);
      
      case 'createDirectRoom':
        return await handleCreateDirectRoom(params.targetUserId, params.accessToken);
      
      case 'blockUser':
        return await handleBlockUser(params.targetUserId, params.accessToken);
      
      case 'kickUser':
        return await handleKickUser(params.roomId, params.targetUserId, params.reason, params.accessToken);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Matrix API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { pathname } = new URL(request.url);
  const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!accessToken) {
    return NextResponse.json({ 
      error: 'Missing access token',
      code: 'MISSING_TOKEN'
    }, { status: 401 });
  }

  try {
    if (pathname.endsWith('/rooms')) {
      return await handleGetGroupRooms(accessToken);
    } else if (pathname.endsWith('/dms')) {
      return await handleGetDirectMessageRooms(accessToken);
    } else {
      return NextResponse.json({ error: 'Invalid endpoint' }, { status: 404 });
    }
  } catch (error) {
    console.error('Matrix API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleLogin({ username, password }: MatrixLoginRequest) {
  const response = await fetch(`${MATRIX_BASE_URL}/_matrix/client/r0/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'm.login.password',
      user: username,
      password: password,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    return NextResponse.json({ error: error.error }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json({
    success: true,
    accessToken: data.access_token,
    userId: data.user_id,
    deviceId: data.device_id,
  });
}

async function handleSendMessage({ roomId, message, accessToken }: MatrixSendMessageRequest) {
  const txnId = `m${Date.now()}`;
  const response = await fetch(
    `${MATRIX_BASE_URL}/_matrix/client/r0/rooms/${roomId}/send/m.room.message/${txnId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        msgtype: 'm.text',
        body: message,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    return NextResponse.json({ error: error.error }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json({ success: true, eventId: data.event_id });
}

async function handleCreateRoom({ name, topic, accessToken }: MatrixCreateRoomRequest) {
  const response = await fetch(`${MATRIX_BASE_URL}/_matrix/client/r0/createRoom`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      name: name,
      topic: topic,
      preset: 'public_chat',
      room_alias_name: name.toLowerCase().replace(/\s+/g, '-'),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    return NextResponse.json({ error: error.error }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json({ success: true, roomId: data.room_id });
}

// Helper function to check if a room is a direct message
async function isDirectMessage(roomId: string, accessToken: string): Promise<boolean> {
  try {
    // Check room creation event for is_direct flag
    const createResponse = await fetch(
      `${MATRIX_BASE_URL}/_matrix/client/r0/rooms/${roomId}/state/m.room.create`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (createResponse.ok) {
      const createData = await createResponse.json();
      return createData.content?.['m.is_direct'] === true;
    }

    return false;
  } catch (error) {
    console.error('Error checking if room is DM:', error);
    return false;
  }
}

// Get the display name for a DM (the other user's name)
async function getDMDisplayName(roomId: string, accessToken: string, currentUserId: string): Promise<string> {
  try {
    const response = await fetch(
      `${MATRIX_BASE_URL}/_matrix/client/r0/rooms/${roomId}/members`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return 'Unknown User';
    }

    const data = await response.json();
    const otherMember = data.chunk.find((event: any) => 
      event.state_key !== currentUserId && event.content?.membership === 'join'
    );

    if (otherMember) {
      return otherMember.content?.displayname || 
             otherMember.state_key?.split(':')[0]?.replace('@', '') || 
             'Unknown User';
    }

    return 'Unknown User';
  } catch (error) {
    console.error('Error getting DM display name:', error);
    return 'Unknown User';
  }
}

async function handleGetDirectMessages(accessToken: string) {
  try {
    // Validate token first
    const userInfo = await validateMatrixToken(accessToken);
    if (userInfo instanceof NextResponse) {
      return userInfo; // Return auth error response
    }
    const currentUserId = userInfo.user_id;

    // Get all joined rooms
    const response = await fetch(`${MATRIX_BASE_URL}/_matrix/client/r0/joined_rooms`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const authError = await handleMatrixAuthError(response, accessToken);
      if (authError) return authError;
      
      const error = await response.json();
      return NextResponse.json({ error: error.error }, { status: response.status });
    }

    const data = await response.json();
    const allRooms = data.joined_rooms;

    // Filter for direct messages and get their display names
    const directMessages = [];
    
    for (const roomId of allRooms) {
      const isDM = await isDirectMessage(roomId, accessToken);
      if (isDM) {
        const displayName = await getDMDisplayName(roomId, accessToken, currentUserId);
        directMessages.push({
          roomId,
          displayName,
          userDisplayName: displayName // For compatibility
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      directMessages 
    });
  } catch (error) {
    console.error('Error getting direct messages:', error);
    return NextResponse.json({ error: 'Failed to get direct messages' }, { status: 500 });
  }
}

async function handleGetRooms(accessToken: string) {
  try {
    // Validate token first
    const userInfo = await validateMatrixToken(accessToken);
    if (userInfo instanceof NextResponse) {
      return userInfo; // Return auth error response
    }
    const currentUserId = userInfo.user_id;

    // Get all joined rooms
    const response = await fetch(`${MATRIX_BASE_URL}/_matrix/client/r0/joined_rooms`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const authError = await handleMatrixAuthError(response, accessToken);
      if (authError) return authError;
      
      const error = await response.json();
      return NextResponse.json({ error: error.error }, { status: response.status });
    }

    const data = await response.json();
    const allRooms = data.joined_rooms;

    // Filter out direct messages, return only regular channels
    const channels = [];
    
    for (const roomId of allRooms) {
      const isDM = await isDirectMessage(roomId, accessToken);
      if (!isDM) {
        channels.push(roomId);
      }
    }

    return NextResponse.json({ 
      success: true, 
      rooms: channels 
    });
  } catch (error) {
    console.error('Error getting rooms:', error);
    return NextResponse.json({ error: 'Failed to get rooms' }, { status: 500 });
  }
}

async function handleGetMessages(roomId: string, accessToken: string) {
  const response = await fetch(
    `${MATRIX_BASE_URL}/_matrix/client/r0/rooms/${roomId}/messages?dir=b&limit=50`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    return NextResponse.json({ error: error.error }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json({ success: true, messages: data.chunk });
}

async function handleGetRoomName(roomId: string, accessToken: string) {
  try {
    const response = await fetch(
      `${MATRIX_BASE_URL}/_matrix/client/r0/rooms/${roomId}/state/m.room.name`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      // If room name doesn't exist, try to get room alias or return null
      return NextResponse.json({ success: true, name: null });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, name: data.name });
  } catch (error) {
    // If there's an error, return null name so fallback logic can handle it
    return NextResponse.json({ success: true, name: null });
  }
}

async function handleGetRoomMembers(roomId: string, accessToken: string) {
  try {
    const response = await fetch(
      `${MATRIX_BASE_URL}/_matrix/client/r0/rooms/${roomId}/members`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    if (!response.ok) {
      return NextResponse.json({ success: true, members: [] });
    }
    const data = await response.json();
    
    // Process the member events to extract useful information
    const members = data.chunk.map((event: any) => {
      const userId = event.user_id || event.state_key;
      
      // Get wallet address from our mapping service instead of Matrix profile
      const walletAddress = getWalletAddressForMatrixUser(userId);
      
      return {
        user_id: userId,
        display_name: event.content?.displayname || null,
        avatar_url: event.content?.avatar_url || null,
        membership: event.content?.membership || 'leave',
        power_level: 0, // Default power level, would need separate call to get actual power levels
        wallet_address: walletAddress
      };
    });
    
    return NextResponse.json({ success: true, members });
  } catch (error) {
    console.error('Error getting room members:', error);
    // Return empty members array if there's an error
    return NextResponse.json({ success: true, members: [] });
  }
}

async function handleCreateDirectRoom(targetUserId: string, accessToken: string) {
  const response = await fetch(`${MATRIX_BASE_URL}/_matrix/client/r0/createRoom`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      is_direct: true,
      invite: [targetUserId],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    return NextResponse.json({ error: error.error }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json({ success: true, roomId: data.room_id });
}

async function handleBlockUser(targetUserId: string, accessToken: string) {
  const response = await fetch(`${MATRIX_BASE_URL}/_matrix/client/r0/user_directory/block`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      user_id: targetUserId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    return NextResponse.json({ error: error.error }, { status: response.status });
  }

  return NextResponse.json({ success: true });
}

async function handleKickUser(roomId: string, targetUserId: string, reason: string, accessToken: string) {
  const response = await fetch(`${MATRIX_BASE_URL}/_matrix/client/r0/rooms/${roomId}/kick`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      user_id: targetUserId,
      reason: reason,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    return NextResponse.json({ error: error.error }, { status: response.status });
  }

  return NextResponse.json({ success: true });
}

// Helper function to get latest message for a room
async function getLatestMessage(roomId: string, accessToken: string): Promise<any> {
  try {
    const response = await fetch(
      `${MATRIX_BASE_URL}/_matrix/client/r0/rooms/${roomId}/messages?dir=b&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const latestMessage = data.chunk?.[0];

    if (latestMessage && latestMessage.type === 'm.room.message') {
      return {
        body: latestMessage.content?.body || '',
        timestamp: latestMessage.origin_server_ts,
        sender: latestMessage.sender
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting latest message:', error);
    return null;
  }
}

// Helper function to get room member count
async function getRoomMemberCount(roomId: string, accessToken: string): Promise<number> {
  try {
    const response = await fetch(
      `${MATRIX_BASE_URL}/_matrix/client/r0/rooms/${roomId}/members`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return 0;
    }

    const data = await response.json();
    return data.chunk.filter((event: any) => event.content?.membership === 'join').length;
  } catch (error) {
    return 0;
  }
}

async function handleGetGroupRooms(accessToken: string) {
  try {
    // Validate token first
    const userInfo = await validateMatrixToken(accessToken);
    if (userInfo instanceof NextResponse) {
      return userInfo; // Return auth error response
    }
    const currentUserId = userInfo.user_id;

    // Get all joined rooms
    const response = await fetch(`${MATRIX_BASE_URL}/_matrix/client/r0/joined_rooms`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const authError = await handleMatrixAuthError(response, accessToken);
      if (authError) return authError;
      
      const error = await response.json();
      return NextResponse.json({ error: error.error }, { status: response.status });
    }

    const data = await response.json();
    const allRooms = data.joined_rooms;

    // Filter for group rooms (not DMs) and enhance with metadata
    const groupChats = [];
    
    for (const roomId of allRooms) {
      const isDM = await isDirectMessage(roomId, accessToken);
      if (!isDM) {
        // Get room name
        const nameResponse = await fetch(
          `${MATRIX_BASE_URL}/_matrix/client/r0/rooms/${roomId}/state/m.room.name`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );
        let roomName = roomId.split(':')[0].replace('!', '').substring(0, 12) + '...';
        if (nameResponse.ok) {
          const nameData = await nameResponse.json();
          roomName = nameData.name || roomName;
        }

        // Get latest message and member count
        const [latestMessage, memberCount] = await Promise.all([
          getLatestMessage(roomId, accessToken),
          getRoomMemberCount(roomId, accessToken)
        ]);

        groupChats.push({
          roomId,
          name: roomName,
          memberCount,
          latestMessage,
          type: 'group'
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      groupChats 
    });
  } catch (error) {
    console.error('Error getting group rooms:', error);
    return NextResponse.json({ error: 'Failed to get group rooms' }, { status: 500 });
  }
}

async function handleGetDirectMessageRooms(accessToken: string) {
  try {
    // Validate token first
    const userInfo = await validateMatrixToken(accessToken);
    if (userInfo instanceof NextResponse) {
      return userInfo; // Return auth error response
    }
    const currentUserId = userInfo.user_id;

    // Get all joined rooms
    const response = await fetch(`${MATRIX_BASE_URL}/_matrix/client/r0/joined_rooms`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const authError = await handleMatrixAuthError(response, accessToken);
      if (authError) return authError;
      
      const error = await response.json();
      return NextResponse.json({ error: error.error }, { status: response.status });
    }

    const data = await response.json();
    const allRooms = data.joined_rooms;

    // Filter for direct messages and enhance with metadata
    const directMessages = [];
    
    for (const roomId of allRooms) {
      const isDM = await isDirectMessage(roomId, accessToken);
      if (isDM) {
        // Get the other user's info
        const membersResponse = await fetch(
          `${MATRIX_BASE_URL}/_matrix/client/r0/rooms/${roomId}/members`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        let otherUserName = 'Unknown User';
        let otherUserId = '';

        if (membersResponse.ok) {
          const membersData = await membersResponse.json();
          const otherMember = membersData.chunk.find((event: any) => 
            event.state_key !== currentUserId && event.content?.membership === 'join'
          );

          if (otherMember) {
            otherUserId = otherMember.state_key;
            otherUserName = otherMember.content?.displayname || 
                           otherMember.state_key?.split(':')[0]?.replace('@', '') || 
                           'Unknown User';
          }
        }

        // Get latest message
        const latestMessage = await getLatestMessage(roomId, accessToken);

        directMessages.push({
          roomId,
          name: otherUserName,
          otherUserId,
          latestMessage,
          memberCount: 2,
          type: 'dm'
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      directMessages 
    });
  } catch (error) {
    console.error('Error getting direct messages:', error);
    return NextResponse.json({ error: 'Failed to get direct messages' }, { status: 500 });
  }
}

// Export the handler functions for use in individual endpoint files
export { handleGetGroupRooms, handleGetDirectMessageRooms };