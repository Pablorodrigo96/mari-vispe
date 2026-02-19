const categoryImages: Record<string, string[]> = {
  tech: [
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop&auto=format',
  ],
  commerce: [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=600&h=400&fit=crop&auto=format',
  ],
  industry: [
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1565793979013-eeadfb948e91?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1567789884554-0b844b597180?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?w=600&h=400&fit=crop&auto=format',
  ],
  services: [
    'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=600&h=400&fit=crop&auto=format',
  ],
  food: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&h=400&fit=crop&auto=format',
  ],
  health: [
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop&auto=format',
  ],
  education: [
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=600&h=400&fit=crop&auto=format',
  ],
  logistics: [
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1553413077-190dd305871c?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1494412519320-aa613dfb7738?w=600&h=400&fit=crop&auto=format',
  ],
  telecom: [
    'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1520869562399-e772f042f422?w=600&h=400&fit=crop&auto=format',
  ],
  energy: [
    'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1548337138-e87d889cc369?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=600&h=400&fit=crop&auto=format',
  ],
  construction: [
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1590644365607-3ad6c8f43d7e?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600&h=400&fit=crop&auto=format',
  ],
  agro: [
    'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&h=400&fit=crop&auto=format',
  ],
};

/**
 * Returns a deterministic fallback image for a listing based on its category and ID.
 * The same listing always gets the same image, but different listings in the same
 * category get different images from the pool.
 */
export function getCategoryFallbackImage(category: string, listingId: string): string {
  const images = categoryImages[category] || categoryImages['services'];
  // Use last 4 hex chars of UUID for deterministic index
  const hex = listingId.replace(/-/g, '').slice(-4);
  const index = parseInt(hex, 16) % images.length;
  return images[index];
}
