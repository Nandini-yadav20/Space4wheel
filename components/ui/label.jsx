"use client";

import React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

// Define labelVariants with conditional class handling
const labelVariants = "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70";

// Label component with ref forwarding
const Label = React.forwardRef(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants, className)} // Combine default and custom class names
    {...props} // Spread remaining props
  />
));

// Display name for debugging purposes
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
