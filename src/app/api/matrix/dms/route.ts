import { handleGetDirectMessageRooms } from '../route';

export async function GET(request: Request) {
  const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!accessToken) {
    return Response.json({ error: 'Missing access token' }, { status: 401 });
  }

  return handleGetDirectMessageRooms(accessToken);
}