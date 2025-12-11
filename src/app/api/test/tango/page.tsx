'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const ALL_OPTION = '__all__';

type TangoCatalogResponse = {
  success: boolean;
  data?: TangoCatalogData;
  message?: string;
};

type TangoCatalogData = {
  catalogName?: string;
  catalogs?: TangoCatalog[];
  items?: TangoCatalogItem[];
  catalogItems?: TangoCatalogItem[];
  brands?: TangoBrand[];
};

type TangoCatalog = {
  catalogName?: string;
  catalogDescription?: string;
  items?: TangoCatalogItem[];
  catalogItems?: TangoCatalogItem[];
  brands?: TangoBrand[];
};

type TangoCatalogItem = Record<string, unknown>;

type TangoBrand = Record<string, unknown> & {
  items?: TangoCatalogItem[];
  catalogItems?: TangoCatalogItem[];
  rewards?: TangoCatalogItem[];
};

type FlattenedReward = {
  id: string;
  name: string;
  status: string;
  rewardType: string;
  currencyCodes: string[];
  countries: string[];
  minValue?: number;
  maxValue?: number;
  fixedValues: number[];
  imageUrl?: string;
  description?: string;
  brandName?: string;
  catalogName: string;
  fulfillmentType?: string;
  terms?: string;
};

const ACTIVE_STATUSES = ['active', 'available', 'enabled', 'true'];

type AnyRecord = Record<string, unknown>;

const valueCollections = [
  'valueOptions',
  'priceOptions',
  'denominations',
  'enabledDenominations',
];

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(record: AnyRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

function getNumber(record: AnyRecord, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' ? value : undefined;
}

function getBoolean(record: AnyRecord, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === 'boolean' ? value : undefined;
}

function getArray(record: AnyRecord, key: string): unknown[] | undefined {
  const value = record[key];
  return Array.isArray(value) ? value : undefined;
}

function getRecord(record: AnyRecord, key: string): AnyRecord | undefined {
  const value = record[key];
  return isRecord(value) ? value : undefined;
}

function isActiveStatus(status: string) {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return ACTIVE_STATUSES.some(
    (activeStatus) =>
      normalized === activeStatus || normalized.startsWith(`${activeStatus}-`),
  );
}

function normaliseReward(item: TangoCatalogItem, catalog: TangoCatalog): FlattenedReward {
  const raw = item as AnyRecord;

  const resolvedName =
    getString(raw, 'rewardName') ??
    getString(raw, 'itemName') ??
    getString(raw, 'itemDescription') ??
    getString(raw, 'name') ??
    'Unnamed reward';

  const brandRecord = getRecord(raw, 'brand');
  const brandName =
    getString(raw, 'brandName') ??
    (brandRecord ? getString(brandRecord, 'brandName') ?? getString(brandRecord, 'name') : undefined);

  const activeFlag = getBoolean(raw, 'active');
  const statusRaw =
    getString(raw, 'status') ??
    (typeof activeFlag === 'boolean' ? (activeFlag ? 'active' : 'inactive') : undefined);

  const rewardType =
    getString(raw, 'rewardType') ??
    getString(raw, 'credentialType') ??
    getString(raw, 'fulfillmentType') ??
    'Unknown';

  const fulfillmentType =
    getString(raw, 'fulfillmentType') ??
    getString(raw, 'deliveryType') ??
    undefined;

  const currencyCodes = new Set<string>();
  const addCurrency = (value?: string) => {
    if (value && value.trim()) {
      currencyCodes.add(value.trim().toUpperCase());
    }
  };

  addCurrency(getString(raw, 'currencyCode'));

  const currencyCodesArray = getArray(raw, 'currencyCodes');
  currencyCodesArray?.forEach((value) => {
    if (typeof value === 'string') {
      addCurrency(value);
    }
  });

  const currenciesArray = getArray(raw, 'currencies');
  currenciesArray?.forEach((currency) => {
    if (typeof currency === 'string') {
      addCurrency(currency);
    } else if (isRecord(currency)) {
      addCurrency(getString(currency, 'currencyCode') ?? getString(currency, 'code'));
    }
  });

  valueCollections.forEach((key) => {
    const options = getArray(raw, key);
    options?.forEach((option) => {
      if (typeof option === 'string') {
        addCurrency(option);
      } else if (isRecord(option)) {
        addCurrency(getString(option, 'currencyCode') ?? getString(option, 'code'));
      }
    });
  });

  const fixedValues: number[] = [];
  valueCollections.forEach((key) => {
    const options = getArray(raw, key);
    options?.forEach((option) => {
      if (typeof option === 'number' && Number.isFinite(option)) {
        fixedValues.push(option);
        return;
      }

      if (isRecord(option)) {
        const rawValue =
          getNumber(option, 'value') ??
          getNumber(option, 'amount') ??
          getNumber(option, 'price');

        if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
          fixedValues.push(rawValue);
        }
      }
    });
  });

  const minValue = getNumber(raw, 'minValue') ?? getNumber(raw, 'minPrice');
  const maxValue = getNumber(raw, 'maxValue') ?? getNumber(raw, 'maxPrice');

  const countries = new Set<string>();
  const addCountry = (value?: string) => {
    if (value && value.trim()) {
      countries.add(value.trim().toUpperCase());
    }
  };

  const countriesArray = getArray(raw, 'countries');
  countriesArray?.forEach((country) => {
    if (typeof country === 'string') {
      addCountry(country);
    } else if (isRecord(country)) {
      addCountry(getString(country, 'countryCode') ?? getString(country, 'code'));
    }
  });

  const restrictionsArray = getArray(raw, 'countryCurrencyRestrictions');
  restrictionsArray?.forEach((restriction) => {
    if (isRecord(restriction)) {
      addCountry(getString(restriction, 'countryCode') ?? getString(restriction, 'country'));
    }
  });

  const availableCountriesArray = getArray(raw, 'countriesAvailable');
  availableCountriesArray?.forEach((country) => {
    if (typeof country === 'string') {
      addCountry(country);
    }
  });

  const imageUrlsArray = getArray(raw, 'imageUrls');
  let imageUrl: string | undefined;
  if (imageUrlsArray) {
    const medium = imageUrlsArray.find(
      (entry) => isRecord(entry) && getString(entry, 'size')?.toLowerCase() === 'medium',
    );
    if (medium && isRecord(medium)) {
      imageUrl = getString(medium, 'url');
    }

    if (!imageUrl) {
      for (const entry of imageUrlsArray) {
        if (isRecord(entry)) {
          const candidate = getString(entry, 'url');
          if (candidate) {
            imageUrl = candidate;
            break;
          }
        }
      }
    }
  }

  if (!imageUrl) {
    imageUrl = getString(raw, 'imageUrl') ?? getString(raw, 'defaultImageUrl');
  }

  if (!imageUrl && brandRecord) {
    imageUrl = getString(brandRecord, 'imageUrl');
  }

  const description =
    getString(raw, 'shortDescription') ??
    getString(raw, 'description') ??
    getString(raw, 'itemDescription') ??
    getString(raw, 'longDescription') ??
    '';

  const terms = getString(raw, 'termsAndConditions') ?? getString(raw, 'terms');

  const catalogRecord = catalog as AnyRecord;
  const catalogName =
    getString(catalogRecord, 'catalogName') ??
    getString(catalogRecord, 'name') ??
    'Catalog';

  const id =
    getString(raw, 'utid') ??
    getString(raw, 'itemIdentifier') ??
    getString(raw, 'id') ??
    `${catalogName}-${resolvedName}`;

  const uniqueCurrencies = Array.from(currencyCodes);
  const uniqueFixedValues = Array.from(new Set(fixedValues)).sort((a, b) => a - b);
  const uniqueCountries = Array.from(countries);

  return {
    id,
    name: resolvedName,
    status: statusRaw ? statusRaw.toLowerCase() : 'unknown',
    rewardType,
    currencyCodes: uniqueCurrencies,
    countries: uniqueCountries,
    minValue,
    maxValue,
    fixedValues: uniqueFixedValues,
    imageUrl,
    description,
    brandName,
    catalogName,
    fulfillmentType,
    terms,
  };
}

function formatMoney(value: number, currencyCodes: string[]) {
  if (!Number.isFinite(value)) return null;
  const currency = currencyCodes[0] || 'USD';

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function buildCatalogs(data: TangoCatalogData | null): TangoCatalog[] {
  if (!data) return [];
  if (Array.isArray(data.catalogs)) return data.catalogs;

  if (Array.isArray(data.brands)) {
    const catalogName =
      typeof data.catalogName === 'string' && data.catalogName.trim()
        ? data.catalogName
        : 'Catalog';

    const itemsMap = new Map<string, TangoCatalogItem>();

    data.brands.forEach((brand) => {
      if (!isRecord(brand)) return;

      const brandRecord = brand as AnyRecord;
      const brandName =
        getString(brandRecord, 'brandName') ??
        getString(brandRecord, 'name');
      const brandKey = getString(brandRecord, 'brandKey');
      const brandImage =
        getString(brandRecord, 'imageUrl') ??
        getString(brandRecord, 'logoUrl') ??
        getString(brandRecord, 'brandImageUrl');

      const sanitizedBrand: AnyRecord = { ...brandRecord };
      delete sanitizedBrand.items;
      delete sanitizedBrand.catalogItems;
      delete sanitizedBrand.rewards;

      const collections = [
        getArray(brandRecord, 'items'),
        getArray(brandRecord, 'catalogItems'),
        getArray(brandRecord, 'rewards'),
      ];

      collections.forEach((collection) => {
        collection?.forEach((item) => {
          if (!isRecord(item)) return;

          const itemRecord = item as AnyRecord;
          const itemId =
            getString(itemRecord, 'utid') ??
            getString(itemRecord, 'itemIdentifier') ??
            getString(itemRecord, 'itemId') ??
            getString(itemRecord, 'id') ??
            `${brandKey ?? brandName ?? 'brand'}-${itemsMap.size}`;

          const enrichedItem: TangoCatalogItem = {
            ...itemRecord,
            brand: {
              ...sanitizedBrand,
              brandName,
              brandKey,
            },
            brandName: getString(itemRecord, 'brandName') ?? brandName,
            brandKey: getString(itemRecord, 'brandKey') ?? brandKey,
            imageUrl:
              getString(itemRecord, 'imageUrl') ??
              getString(itemRecord, 'itemImageUrl') ??
              getString(itemRecord, 'defaultImageUrl') ??
              brandImage,
          };

          itemsMap.set(itemId, enrichedItem);
        });
      });
    });

    return [
      {
        catalogName,
        items: Array.from(itemsMap.values()),
        brands: data.brands,
      },
    ];
  }

  if (Array.isArray(data.items)) {
    return [
      {
        catalogName: 'Default Catalog',
        items: data.items,
      },
    ];
  }

  if (Array.isArray(data.catalogItems)) {
    return [
      {
        catalogName: 'Default Catalog',
        items: data.catalogItems,
      },
    ];
  }

  return [];
}

export default function TangoCatalogTestPage() {
  const [rawData, setRawData] = useState<TangoCatalogData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [rewardTypeFilter, setRewardTypeFilter] = useState<string>(ALL_OPTION);
  const [currencyFilter, setCurrencyFilter] = useState<string>(ALL_OPTION);
  const [countryFilter, setCountryFilter] = useState<string>(ALL_OPTION);
  const [catalogFilter, setCatalogFilter] = useState<string>(ALL_OPTION);
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/test/tango/catalogs');
      const payload: TangoCatalogResponse = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.message || 'Failed to load Tango catalog from sandbox',
        );
      }

      setRawData(payload.data ?? null);
    } catch (err) {
      console.error('Failed to load Tango catalog:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const catalogs = useMemo(() => buildCatalogs(rawData), [rawData]);

  const rewards = useMemo<FlattenedReward[]>(() => {
    return catalogs.flatMap((catalog) => {
      const items = Array.isArray(catalog.items)
        ? catalog.items
        : Array.isArray(catalog.catalogItems)
          ? catalog.catalogItems
          : [];

      return items.map((item) => normaliseReward(item, catalog));
    });
  }, [catalogs]);

  const catalogOptions = useMemo(() => {
    const names = new Set<string>();
    catalogs.forEach((catalog) => {
      if (catalog.catalogName) {
        names.add(catalog.catalogName);
      }
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [catalogs]);

  const rewardTypeOptions = useMemo(() => {
    const types = new Set<string>();
    rewards.forEach((reward) => {
      if (reward.rewardType) {
        types.add(reward.rewardType);
      }
    });
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  }, [rewards]);

  const currencyOptions = useMemo(() => {
    const currencies = new Set<string>();
    rewards.forEach((reward) => {
      reward.currencyCodes.forEach((code) => currencies.add(code));
    });
    return Array.from(currencies).sort((a, b) => a.localeCompare(b));
  }, [rewards]);

  const countryOptions = useMemo(() => {
    const countries = new Set<string>();
    rewards.forEach((reward) => {
      reward.countries.forEach((country) => countries.add(country));
    });
    return Array.from(countries).sort((a, b) => a.localeCompare(b));
  }, [rewards]);

  const filteredRewards = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return rewards
      .filter((reward) => {
        if (statusFilter === 'active' && !isActiveStatus(reward.status)) {
          return false;
        }

        if (rewardTypeFilter !== ALL_OPTION && reward.rewardType !== rewardTypeFilter) {
          return false;
        }

        if (currencyFilter !== ALL_OPTION && !reward.currencyCodes.includes(currencyFilter)) {
          return false;
        }

        if (countryFilter !== ALL_OPTION && !reward.countries.includes(countryFilter)) {
          return false;
        }

        if (catalogFilter !== ALL_OPTION && reward.catalogName !== catalogFilter) {
          return false;
        }

        if (search) {
          const haystack = `${reward.name} ${reward.brandName ?? ''} ${reward.description ?? ''}`.toLowerCase();
          if (!haystack.includes(search)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rewards, searchTerm, rewardTypeFilter, currencyFilter, countryFilter, catalogFilter, statusFilter]);

  const totalRewards = rewards.length;
  const activeRewards = rewards.filter((reward) => isActiveStatus(reward.status)).length;
  const uniqueBrands = new Set(
    rewards.map((reward) => reward.brandName).filter(Boolean) as string[],
  ).size;

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <Card className="mb-6 border border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-2xl font-semibold text-gray-900">
                  Tango Sandbox Catalog
                </CardTitle>
                <CardDescription>
                  Test the <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">GET /catalogs</code> endpoint and explore available rewards.
                </CardDescription>
              </div>
              <Button onClick={loadCatalog} disabled={loading} className="w-full md:w-auto">
                <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                Refresh Catalog
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-gray-500">Total rewards</p>
              <p className="text-2xl font-semibold text-gray-900">{totalRewards}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Active rewards</p>
              <p className="text-2xl font-semibold text-gray-900">{activeRewards}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Brands represented</p>
              <p className="text-2xl font-semibold text-gray-900">{uniqueBrands}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Filters</CardTitle>
            <CardDescription>Refine the catalog by reward metadata.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="search">Search rewards</Label>
              <Input
                id="search"
                placeholder="Search by name, brand, or description"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Reward type</Label>
              <Select value={rewardTypeFilter} onValueChange={setRewardTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All reward types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_OPTION}>All reward types</SelectItem>
                  {rewardTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All currencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_OPTION}>All currencies</SelectItem>
                  {currencyOptions.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Country</Label>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_OPTION}>All countries</SelectItem>
                  {countryOptions.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Catalog</Label>
              <Select value={catalogFilter} onValueChange={setCatalogFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All catalogs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_OPTION}>All catalogs</SelectItem>
                  {catalogOptions.map((catalogName) => (
                    <SelectItem key={catalogName} value={catalogName}>
                      {catalogName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Active only" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active only</SelectItem>
                  <SelectItem value="all">All statuses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {error ? (
          <Card className="border border-red-200 bg-red-50">
            <CardContent className="py-6">
              <p className="text-sm font-medium text-red-700">{error}</p>
              <Button onClick={loadCatalog} className="mt-4">
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredRewards.map((reward) => {
              const active = isActiveStatus(reward.status);
              const minValueFormatted =
                reward.minValue !== undefined
                  ? formatMoney(reward.minValue, reward.currencyCodes)
                  : null;
              const maxValueFormatted =
                reward.maxValue !== undefined
                  ? formatMoney(reward.maxValue, reward.currencyCodes)
                  : null;
              const fixedValueStrings = reward.fixedValues
                .map((value) => formatMoney(value, reward.currencyCodes))
                .filter(Boolean) as string[];

              return (
                <Card key={reward.id} className="border border-gray-200 shadow-sm">
                  <CardHeader className="space-y-4 pb-4">
                    <div className="flex items-start gap-4">
                      {reward.imageUrl ? (
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-white">
                          <Image
                            src={reward.imageUrl}
                            alt={reward.name}
                            width={64}
                            height={64}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-100 text-gray-500">
                          {reward.name.charAt(0)}
                        </div>
                      )}
                      <div className="space-y-2">
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          {reward.name}
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-600">
                          {reward.brandName ? `${reward.brandName} • ` : ''}
                          {reward.catalogName}
                        </CardDescription>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              'capitalize border-green-200 bg-green-100 text-green-700',
                              !active && 'border-gray-200 bg-gray-100 text-gray-600',
                            )}
                          >
                            {active ? 'active' : reward.status || 'unknown'}
                          </Badge>
                          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                            {reward.rewardType}
                          </Badge>
                          {reward.fulfillmentType ? (
                            <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700">
                              {reward.fulfillmentType}
                            </Badge>
                          ) : null}
                          {reward.currencyCodes.length ? (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                              {reward.currencyCodes.join(', ')}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    {reward.description ? (
                      <p className="text-sm leading-relaxed text-gray-700">
                        {reward.description}
                      </p>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">Min value</p>
                        <p className="text-sm font-medium text-gray-900">
                          {minValueFormatted ?? 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">Max value</p>
                        <p className="text-sm font-medium text-gray-900">
                          {maxValueFormatted ?? 'N/A'}
                        </p>
                      </div>
                    </div>

                    {fixedValueStrings.length ? (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">Fixed denominations</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {fixedValueStrings.map((value) => (
                            <Badge
                              key={value}
                              variant="outline"
                              className="border-gray-200 bg-white text-gray-800"
                            >
                              {value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {reward.countries.length ? (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">Supported countries</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {reward.countries.map((country) => (
                            <Badge
                              key={country}
                              variant="outline"
                              className="border-gray-200 bg-gray-100 text-gray-700"
                            >
                              {country}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {reward.terms ? (
                      <div className="space-y-2">
                        <Separator />
                        <p className="text-xs uppercase tracking-wide text-gray-500">Terms</p>
                        <p className="text-sm text-gray-700 whitespace-pre-line">
                          {reward.terms}
                        </p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!loading && !error && filteredRewards.length === 0 ? (
          <div className="mt-10 rounded-md border border-gray-200 bg-white p-10 text-center text-gray-600">
            No rewards match the selected filters.
          </div>
        ) : null}
      </div>
    </div>
  );
}
