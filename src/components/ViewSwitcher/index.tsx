import React from 'react';
import ListView from './ListView';
import GroupedView from './GroupedView';
import GridView from './GridView';
import type {BlogListItem} from './types';
import {useViewMode} from '../../contexts/ViewMode';

export default function ViewSwitcher({
  items,
}: {
  items: readonly BlogListItem[];
}): React.JSX.Element {
  const {view} = useViewMode();
  const posts = items.map(({content}) => content.metadata);

  if (view === 'grouped') {
    return <GroupedView posts={posts} />;
  }
  if (view === 'grid') {
    return <GridView posts={posts} />;
  }
  return <ListView posts={posts} />;
}
