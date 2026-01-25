import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type { Category } from "@/lib/db/schema";
import type { CreateCategoryInput, UpdateCategoryInput } from "@/lib/validations/category";

// Query keys
export const categoryKeys = {
  all: ["categories"] as const,
  lists: () => [...categoryKeys.all, "list"] as const,
  list: () => [...categoryKeys.lists()] as const,
  details: () => [...categoryKeys.all, "detail"] as const,
  detail: (id: string) => [...categoryKeys.details(), id] as const,
};

// Types
type CategoriesResponse = {
  categories: Category[];
};

type CategoryResponse = {
  category: Category;
};

type DeleteResponse = {
  message: string;
};

// API functions
async function fetchCategories(): Promise<CategoriesResponse> {
  const response = await fetch("/api/categories");
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch categories");
  }
  return response.json();
}

async function fetchCategory(id: string): Promise<CategoryResponse> {
  const response = await fetch(`/api/categories/${id}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch category");
  }
  return response.json();
}

async function createCategory(
  data: CreateCategoryInput
): Promise<CategoryResponse> {
  const response = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create category");
  }
  return response.json();
}

async function updateCategory({
  id,
  data,
}: {
  id: string;
  data: UpdateCategoryInput;
}): Promise<CategoryResponse> {
  const response = await fetch(`/api/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update category");
  }
  return response.json();
}

async function deleteCategory(id: string): Promise<DeleteResponse> {
  const response = await fetch(`/api/categories/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete category");
  }
  return response.json();
}

// Hooks

/**
 * Fetch all categories (default + user's custom)
 */
export function useCategories(
  options?: Omit<
    UseQueryOptions<CategoriesResponse, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000, // Categories rarely change, cache for 5 minutes
    ...options,
  });
}

/**
 * Fetch a single category by ID
 */
export function useCategory(
  id: string,
  options?: Omit<
    UseQueryOptions<CategoryResponse, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: () => fetchCategory(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Create a new category
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategory,
    onSuccess: (data) => {
      // Optimistically add to the list
      queryClient.setQueryData<CategoriesResponse>(
        categoryKeys.list(),
        (old) => {
          if (!old) return { categories: [data.category] };
          return { categories: [...old.categories, data.category] };
        }
      );
      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
    },
  });
}

/**
 * Update an existing category
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCategory,
    onSuccess: (data, variables) => {
      // Update the specific category in cache
      queryClient.setQueryData(categoryKeys.detail(variables.id), data);
      // Update in the list
      queryClient.setQueryData<CategoriesResponse>(
        categoryKeys.list(),
        (old) => {
          if (!old) return old;
          return {
            categories: old.categories.map((cat) =>
              cat.id === variables.id ? data.category : cat
            ),
          };
        }
      );
    },
  });
}

/**
 * Delete a category
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: (_, id) => {
      // Remove from detail cache
      queryClient.removeQueries({ queryKey: categoryKeys.detail(id) });
      // Remove from list
      queryClient.setQueryData<CategoriesResponse>(
        categoryKeys.list(),
        (old) => {
          if (!old) return old;
          return {
            categories: old.categories.filter((cat) => cat.id !== id),
          };
        }
      );
      // Invalidate subscriptions since some may have had this category
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
  });
}

/**
 * Get categories for select/dropdown - transforms to label/value format
 */
export function useCategoryOptions() {
  const { data, ...rest } = useCategories();

  const options =
    data?.categories.map((cat) => ({
      value: cat.id,
      label: cat.name,
      icon: cat.icon,
      color: cat.color,
      isCustom: cat.userId !== null,
    })) ?? [];

  return {
    ...rest,
    data,
    options,
    defaultCategories: options.filter((o) => !o.isCustom),
    customCategories: options.filter((o) => o.isCustom),
  };
}
