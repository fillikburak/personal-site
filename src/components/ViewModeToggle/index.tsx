import React from 'react';
import clsx from 'clsx';
import Translate, {translate} from '@docusaurus/Translate';
import {VIEW_IDS, useViewMode, type ViewId} from '../../contexts/ViewMode';
import styles from './styles.module.css';

function ViewLabel({id}: {id: ViewId}): React.JSX.Element {
  switch (id) {
    case 'list':
      return (
        <Translate id="viewMode.list" description="View toggle: list view">
          List
        </Translate>
      );
    case 'grouped':
      return (
        <Translate
          id="viewMode.grouped"
          description="View toggle: grouped-by-topic view">
          Grouped
        </Translate>
      );
    case 'grid':
      return (
        <Translate id="viewMode.grid" description="View toggle: grid view">
          Grid
        </Translate>
      );
  }
}

export default function ViewModeToggle(): React.JSX.Element {
  const {view, setView} = useViewMode();
  const ariaLabel = translate({
    id: 'viewMode.ariaLabel',
    message: 'View mode',
    description: 'Accessible label for the List/Grouped/Grid toggle',
  });

  return (
    <div className={styles.switcher} role="tablist" aria-label={ariaLabel}>
      {VIEW_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={view === id}
          className={clsx(styles.switchBtn, view === id && styles.active)}
          onClick={() => setView(id)}>
          <ViewLabel id={id} />
        </button>
      ))}
    </div>
  );
}
