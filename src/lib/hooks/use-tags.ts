import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { Tag } from "@/lib/db/schema";
import type { CreateTagInput, UpdateTagInput } from "@/lib/validations/tag";
import { isRetryableError, getErrorMessage } from "@/lib/utils/errors";

// Query keys
export const tagKeys = {
  all: ["tags"] as const,
  lists: () => [...tagKeys.all, "list"] as const,
  list: () => [...tagKeys.lists()] as const,
  details: () => [...tagKeys.all, "detail"] as const,
  detail: (id: string) => [...tagKeys.details(), id] as const,
};

// Types
type TagsResponse = {
  tags: Tag[];
};

type TagResponse = {
  tag: Tag;
};

type DeleteResponse = {
  message: string;
};

// API functions
async function fetchTags(): Promise<TagsResponse> {
  const response = await fetch("/api/tags");
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch tags");
  }
  return response.json();
}

async function fetchTag(id: string): Promise<TagResponse> {
  const response = await fetch(`/api/tags/${id}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch tag");
  }
  return response.json();
}

async function createTag(data: CreateTagInput): Promise<TagResponse> {
  const response = await fetch("/api/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create tag");
  }
  return response.json();
}

async function updateTag({
  id,
  data,
}: {
  id: string;
  data: UpdateTagInput;
}): Promise<TagResponse> {
  const response = await fetch(`/api/tags/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update tag");
  }
  return response.json();
}

async function deleteTag(id: string): Promise<DeleteResponse> {
  const response = await fetch(`/api/tags/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete tag");
  }
  return response.json();
}

// Hooks

/**
 * Fetch all tags for the current user
 */
export function useTags(
  options?: Omit<
    UseQueryOptions<TagsResponse, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: tagKeys.list(),
    queryFn: fetchTags,
    staleTime: 5 * 60 * 1000, // Tags rarely change, cache for 5 minutes
    ...options,
  });
}

/**
 * Fetch a single tag by ID
 */
export function useTag(
  id: string,
  options?: Omit<
    UseQueryOptions<TagResponse, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: tagKeys.detail(id),
    queryFn: () => fetchTag(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Create a new tag
 */
export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTag,
    retry: (failureCount, error) => {
      // Only retry on network errors or 503
      if (!isRetryableError(error)) return false;
      // Retry up to 2 times (3 total attempts)
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s
      return Math.min(1000 * 2 ** attemptIndex, 2000);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), {
        duration: Infinity,
        action: {
          label: "Try again",
          onClick: () => {
            // User can manually retry via form resubmit
          },
        },
      });
    },
    onSuccess: (data) => {
      // Optimistically add to the list
      queryClient.setQueryData<TagsResponse>(
        tagKeys.list(),
        (old) => {
          if (!old) return { tags: [data.tag] };
          return { tags: [...old.tags, data.tag] };
        }
      );
      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
    },
  });
}

/**
 * Update an existing tag
 */
export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTag,
    retry: (failureCount, error) => {
      // Only retry on network errors or 503
      if (!isRetryableError(error)) return false;
      // Retry up to 2 times (3 total attempts)
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s
      return Math.min(1000 * 2 ** attemptIndex, 2000);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), {
        duration: Infinity,
        action: {
          label: "Try again",
          onClick: () => {
            // User can manually retry via form resubmit
          },
        },
      });
    },
    onSuccess: (data, variables) => {
      // Update the specific tag in cache
      queryClient.setQueryData(tagKeys.detail(variables.id), data);
      // Update in the list
      queryClient.setQueryData<TagsResponse>(
        tagKeys.list(),
        (old) => {
          if (!old) return old;
          return {
            tags: old.tags.map((tag) =>
              tag.id === variables.id ? data.tag : tag
            ),
          };
        }
      );
    },
  });
}

/**
 * Delete a tag
 */
export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTag,
    retry: (failureCount, error) => {
      // Only retry on network errors or 503
      if (!isRetryableError(error)) return false;
      // Retry up to 2 times (3 total attempts)
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s
      return Math.min(1000 * 2 ** attemptIndex, 2000);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), {
        duration: Infinity,
        action: {
          label: "Try again",
          onClick: () => {
            // User can manually retry via form resubmit
          },
        },
      });
    },
    onSuccess: (_, id) => {
      // Remove from detail cache
      queryClient.removeQueries({ queryKey: tagKeys.detail(id) });
      // Remove from list
      queryClient.setQueryData<TagsResponse>(
        tagKeys.list(),
        (old) => {
          if (!old) return old;
          return {
            tags: old.tags.filter((tag) => tag.id !== id),
          };
        }
      );
      // Invalidate transactions since tags may have been removed from them
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

/**
 * Get tags for select/dropdown - transforms to label/value format
 */
export function useTagOptions() {
  const { data, ...rest } = useTags();

  const options =
    data?.tags.map((tag) => ({
      value: tag.id,
      label: tag.name,
      color: tag.color,
    })) ?? [];

  return {
    ...rest,
    data,
    options,
  };
}

// Re-export Tag type for convenience
export type { Tag };
