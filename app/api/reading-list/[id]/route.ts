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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { url, title, metadata, read } = await request.json();

    const data = readData();
    const linkIndex = data.links.findIndex((link: any) => link.id === id);

    if (linkIndex === -1) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    if (url) data.links[linkIndex].url = url;
    if (title) data.links[linkIndex].title = title;
    if (metadata) data.links[linkIndex].metadata = { ...data.links[linkIndex].metadata, ...metadata };
    if (typeof read === 'boolean') data.links[linkIndex].read = read;

    if (writeData(data)) {
      return NextResponse.json(data.links[linkIndex]);
    } else {
      return NextResponse.json(
        { error: 'Failed to update link' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating link:', error);
    return NextResponse.json(
      { error: 'Failed to update link' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const data = readData();
    const linkIndex = data.links.findIndex((link: any) => link.id === id);

    if (linkIndex === -1) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    data.links.splice(linkIndex, 1);

    if (writeData(data)) {
      return new NextResponse(null, { status: 204 });
    } else {
      return NextResponse.json(
        { error: 'Failed to delete link' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error deleting link:', error);
    return NextResponse.json(
      { error: 'Failed to delete link' },
      { status: 500 }
    );
  }
}
