import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
// Import the JSON statically so the Next.js bundler includes it in the function.
import readingListData from '../../../public/reader/reading-list.json';

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
    // Prefer the committed reading list under public/reader/. Fall back to the
    // legacy data/reading-list.json path for local dashboard writes.
    const fileData = readData();
    const base = (fileData.links && fileData.links.length > 0)
      ? fileData
      : (readingListData as { links: any[] });

    const links = (base.links || []).map((link: any) => ({
      ...link,
      screenshotHash: crypto.createHash('md5').update(link.url).digest('hex'),
    }));
    return NextResponse.json({ ...base, links });
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
