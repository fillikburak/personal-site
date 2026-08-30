import React, {useMemo, useState} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import type {PostMetadata} from './types';
import {formatDate} from './formatDate';
import styles from './groupedView.module.css';

type Group = {
  label: string;
  permalink: string;
  posts: PostMetadata[];
};

// Grouped by each post's *primary* tag (its first one) rather than every
// tag it has — otherwise a post with several tags would be duplicated
// across multiple topic sections, and topic counts wouldn't add up to the
// same total post count shown in List/Grid.
function useGroups(posts: PostMetadata[]): Group[] {
  return useMemo(() => {
    const byLabel = new Map<string, Group>();
    for (const post of posts) {
      const primaryTag = post.tags[0];
      if (!primaryTag) {
        continue;
      }
      const existing = byLabel.get(primaryTag.label);
      if (existing) {
        existing.posts.push(post);
      } else {
        byLabel.set(primaryTag.label, {
          label: primaryTag.label,
          permalink: primaryTag.permalink,
          posts: [post],
        });
      }
    }
    return Array.from(byLabel.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [posts]);
}

export default function GroupedView({
  posts,
}: {
  posts: PostMetadata[];
}): React.JSX.Element {
  const {
    i18n: {currentLocale},
  } = useDocusaurusContext();
  const groups = useGroups(posts);
  const [selected, setSelected] = useState<string | null>(null);

  const visibleGroups = selected
    ? groups.filter((g) => g.label === selected)
    : groups;

  const topicsAriaLabel = translate({
    id: 'groupedView.topicsAriaLabel',
    message: 'Topics',
    description: 'Accessible label for the topic list in Grouped view',
  });

  return (
    <div className={styles.layout}>
      <nav className={styles.sidebar} aria-label={topicsAriaLabel}>
        <button
          type="button"
          className={clsx(styles.navItem, selected === null && styles.active)}
          onClick={() => setSelected(null)}>
          <Translate
            id="groupedView.allTopics"
            description="Grouped view: shows every topic at once">
            All topics
          </Translate>
        </button>
        {groups.map((group) => (
          <button
            key={group.label}
            type="button"
            className={clsx(
              styles.navItem,
              selected === group.label && styles.active,
            )}
            onClick={() => setSelected(group.label)}>
            {group.label}
            <span className={styles.count}>{group.posts.length}</span>
          </button>
        ))}
      </nav>

      <div className={styles.main}>
        {visibleGroups.map((group) => (
          <section key={group.label} className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <Link to={group.permalink}>{group.label}</Link>
            </h2>
            <div className={styles.cards}>
              {group.posts.map((post) => (
                <article key={post.permalink} className={styles.card}>
                  <div className={styles.cardDate}>
                    {formatDate(post.date, currentLocale)}
                  </div>
                  <h3 className={styles.cardTitle}>
                    <Link to={post.permalink}>{post.title}</Link>
                  </h3>
                  <p className={styles.cardDescription}>{post.description}</p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
