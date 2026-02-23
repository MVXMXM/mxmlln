import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'reading-list.json');

// Helper function to read data
function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data file:', error);
    return { links: [] };
  }
}

// Helper function to write data
function writeData(data: any) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing data file:', error);
    return false;
  }
}

export async function GET() {
  try {
    const data = readData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching reading list:', error);
    return NextResponse.json(
      { error: 'Failed to load reading list' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, title } = await request.json();
    if (!url || !title) {
      return NextResponse.json(
        { error: 'URL and title are required' },
        { status: 400 }
      );
    }

    const data = readData();
    const newLink = {
      id: Date.now().toString(),
      url,
      title,
      createdAt: new Date().toISOString(),
      metadata: {},
      read: false
    };

    data.links.push(newLink);

    if (writeData(data)) {
      return NextResponse.json(newLink, { status: 201 });
    } else {
      return NextResponse.json(
        { error: 'Failed to save link' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error adding link:', error);
    return NextResponse.json(
      { error: 'Failed to add link' },
      { status: 500 }
    );
  }
}
