export type ItemBadge = { label: string; color: string };

export type ItemSummary = {
  primary: string;
  secondary?: string;
  image?: string;
  group?: string;
  badge?: ItemBadge;
  meta?: string;
  shape?: string;
};
