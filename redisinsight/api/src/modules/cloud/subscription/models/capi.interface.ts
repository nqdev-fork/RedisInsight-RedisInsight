import { CloudSubscriptionStatus } from 'src/modules/cloud/subscription/models/cloud-subscription';

interface ICloudCapiSubscriptionPricing {
  type: string;
  typeDetails?: string;
  quantity: number;
  quantityMeasurement: string;
  pricePerUnit?: number;
  priceCurrency?: string;
  pricePeriod?: string;
}

interface ICloudCapiSubscriptionRegion {
  region: string;
  networking: any[];
  preferredAvailabilityZones: string[];
  multipleAvailabilityZones: boolean;
}

interface ICloudCapiSubscriptionDetails {
  provider: string;
  cloudAccountId: number;
  totalSizeInGb: number;
  regions: ICloudCapiSubscriptionRegion[];
}

export interface ICloudCapiSubscription {
  id: number;
  name: string;
  status: CloudSubscriptionStatus;
  paymentMethodId: number;
  memoryStorage: string;
  storageEncryption: boolean;
  numberOfDatabases: number;
  subscriptionPricing: ICloudCapiSubscriptionPricing[];
  cloudDetails: ICloudCapiSubscriptionDetails[];
}

export interface ICloudCapiSubscriptions {
  accountId: number;
  subscriptions: ICloudCapiSubscription[];
}
