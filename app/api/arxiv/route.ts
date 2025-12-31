import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Missing paper ID' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`,
      {
        headers: {
          'User-Agent': 'arXiv-Paper-Analyzer/1.0',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch paper from arXiv' },
        { status: response.status }
      );
    }

    const xmlText = await response.text();
    
    return new NextResponse(xmlText, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    console.error('Error fetching from arXiv:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching the paper' },
      { status: 500 }
    );
  }
}
