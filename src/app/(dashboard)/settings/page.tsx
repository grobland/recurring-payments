"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser, useUpdateUser } from "@/lib/hooks";
import { SUPPORTED_CURRENCIES } from "@/lib/constants/currencies";
import { toast } from "sonner";
import { CategoryManager } from "@/components/categories/category-manager";
import { TagManager } from "@/components/tags";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  displayCurrency: z.string().length(3),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { data, isLoading } = useUser();
  const updateUser = useUpdateUser();

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      displayCurrency: "GBP",
    },
    values: data?.user
      ? {
          name: data.user.name ?? "",
          displayCurrency: data.user.displayCurrency ?? "GBP",
        }
      : undefined,
  });

  const onSubmit = async (values: ProfileForm) => {
    try {
      await updateUser.mutateAsync(values);
      toast.success("Profile updated");
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Manage your account settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Email</FormLabel>
                <Input
                  value={data?.user?.email ?? ""}
                  disabled
                  className="mt-2 bg-muted h-11"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              <FormField
                control={form.control}
                name="displayCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Currency</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SUPPORTED_CURRENCIES.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.symbol} {currency.code} - {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={updateUser.isPending || !form.formState.isDirty}
                className="h-11"
              >
                {updateUser.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <CategoryManager />
      <TagManager />
    </div>
  );
}
