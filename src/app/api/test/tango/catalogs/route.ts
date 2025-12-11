import { NextRequest, NextResponse } from 'next/server';

const TANGO_BASE_URL = 'https://integration-api.tangocard.com/raas/v2/catalogs';

function getAuthHeader() {
  const username =
    process.env.TANGO_TEST_USERNAME ||
    process.env.TANGO_SANDBOX_USERNAME ||
    'QAPlatform2';
  const password =
    process.env.TANGO_TEST_PASSWORD ||
    process.env.TANGO_SANDBOX_PASSWORD ||
    'apYPfT6HNONpDRUj3CLGWYt7gvIHONpDRUYPfT6Hj';

  if (!username || !password) {
    return null;
  }

  return Buffer.from(`${username}:${password}`).toString('base64');
}

const FORWARDED_QUERY_KEYS = [
  'rewardType',
  'currencyCode',
  'countryCode',
  'brandKey',
  'catalog',
  'fulfillmentType',
  'page',
  'pageSize',
  'utid',
  'rewardName',
  'active',
  'verbose',
];

export async function GET(req: NextRequest) {
  const authHeader = getAuthHeader();

  if (!authHeader) {
    return NextResponse.json(
      {
        success: false,
        message: 'Missing Tango sandbox credentials',
      },
      { status: 500 },
    );
  }

  const searchParams = req.nextUrl.searchParams;
  const forwardedParams = new URLSearchParams();

  FORWARDED_QUERY_KEYS.forEach((key) => {
    const value = searchParams.get(key);
    if (value) {
      forwardedParams.append(key, value);
    }
  });

  if (!forwardedParams.has('verbose')) {
    forwardedParams.set('verbose', 'true');
  }

  const requestUrl = `${TANGO_BASE_URL}?${forwardedParams.toString()}`;

  try {
    const tangoResponse = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${authHeader}`,
      },
      cache: 'no-store',
    });

    if (!tangoResponse.ok) {
      const errorPayload = await tangoResponse
        .clone()
        .json()
        .catch(() => null);

      return NextResponse.json(
        {
          success: false,
          message: 'Failed to fetch Tango catalog',
          status: tangoResponse.status,
          tangoError: errorPayload,
        },
        { status: tangoResponse.status },
      );
    }

    const data = await tangoResponse.json();

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Tango catalog fetch failed:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unexpected error fetching Tango catalog',
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 },
    );
  }
}
