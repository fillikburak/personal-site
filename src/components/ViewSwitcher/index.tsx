import React from 'react';
import GroupedView from './GroupedView';
import type {BlogListItem} from './types';

export default function ViewSwitcher({
  items,
}: {
  items: readonly BlogListItem[];
}): React.JSX.Element {
  const posts = items.map(({content}) => content.metadata);
  return <GroupedView posts={posts} />;
}
