export type PostTag = {
  label: string;
  permalink: string;
};

export type PostMetadata = {
  title: string;
  permalink: string;
  date: string;
  description: string;
  readingTime?: number;
  tags: PostTag[];
};

export type BlogListItem = {
  content: {
    metadata: PostMetadata;
  };
};
