"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogHbReading } from "@/lib/hooks/useHbReading";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";

export interface HbReadingFormProps {
  patientId: string;
  onSuccess?: () => void;
}

const hbReadingSchema = z
  .object({
    hb_value: z.coerce
      .number({ invalid_type_error: "Must be a valid reading number." })
      .min(0.1, "Hemoglobin level must be greater than 0.")
      .max(20.0, "Hemoglobin level cannot exceed 20 g/dL."),
    reading_date: z.string().min(1, "Please select a reading date."),
    post_transfusion: z.boolean().default(false),
    units_transfused: z.coerce
      .number()
      .min(1, "Minimum transfused is 1 unit.")
      .max(10, "Maximum transfused is 10 units.")
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      if (data.post_transfusion && !data.units_transfused) {
        return false;
      }
      return true;
    },
    {
      message: "Units transfused is required for post-transfusion recordings.",
      path: ["units_transfused"],
    }
  );

type HbReadingFormValues = z.infer<typeof hbReadingSchema>;

export function HbReadingForm({ patientId, onSuccess }: HbReadingFormProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const logReadingMutation = useLogHbReading();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<HbReadingFormValues>({
    resolver: zodResolver(hbReadingSchema),
    defaultValues: {
      reading_date: new Date().toISOString().split("T")[0]!,
      post_transfusion: false,
    },
  });

  const isPostTransfusion = watch("post_transfusion");

  const onSubmit = (values: HbReadingFormValues) => {
    const payload = {
      hb_value: values.hb_value,
      reading_date: values.reading_date,
      post_transfusion: values.post_transfusion,
      ...(values.post_transfusion && values.units_transfused
        ? { units_transfused: values.units_transfused }
        : {}),
    };

    logReadingMutation.mutate(
      {
        patientId,
        data: payload,
      },
      {
        onSuccess: () => {
          toast.success("Clinical Hemoglobin reading successfully saved.");
          reset();
          setIsOpen(false);
          if (onSuccess) onSuccess();
        },
        onError: (err: any) => {
          toast.error(err.message || "An exception occurred saving reading.");
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-2 px-4 py-2 rounded-xl shadow-lg shadow-rose-900/10 active:scale-95 transition-all select-none">
        <Plus className="w-4 h-4" />
        Log Hb Reading
      </DialogTrigger>
      
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-sm rounded-3xl select-none">
        <DialogHeader>
          <DialogTitle className="text-slate-100 font-extrabold">Log Clinical Event</DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Log raw laboratory records to rebuild patient Prophet forecasting models.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Hb Value */}
          <div className="space-y-1.5">
            <Label htmlFor="hb_value" className="text-xs text-slate-400 font-semibold">
              Hb Value (g/dL)
            </Label>
            <Input
              id="hb_value"
              type="number"
              step="0.1"
              placeholder="e.g. 7.2"
              className="bg-slate-950 border-slate-800 focus-visible:ring-rose-500 text-slate-100 h-9"
              {...register("hb_value")}
            />
            {errors.hb_value && (
              <span className="text-[10px] text-rose-400 font-semibold block">
                {errors.hb_value.message}
              </span>
            )}
          </div>

          {/* Reading Date */}
          <div className="space-y-1.5">
            <Label htmlFor="reading_date" className="text-xs text-slate-400 font-semibold">
              Reading Date
            </Label>
            <Input
              id="reading_date"
              type="date"
              className="bg-slate-950 border-slate-800 focus-visible:ring-rose-500 text-slate-100 h-9"
              {...register("reading_date")}
            />
            {errors.reading_date && (
              <span className="text-[10px] text-rose-400 font-semibold block">
                {errors.reading_date.message}
              </span>
            )}
          </div>

          {/* Post Transfusion Checkbox */}
          <div className="flex items-center gap-2 py-1">
            <input
              id="post_transfusion"
              type="checkbox"
              className="w-4 h-4 rounded border-slate-800 text-rose-600 focus:ring-rose-500 bg-slate-950 accent-rose-600"
              {...register("post_transfusion")}
            />
            <Label htmlFor="post_transfusion" className="text-xs text-slate-300 font-semibold cursor-pointer">
              This reading is post-transfusion
            </Label>
          </div>

          {/* Units Transfused (Conditional) */}
          {isPostTransfusion && (
            <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
              <Label htmlFor="units_transfused" className="text-xs text-slate-400 font-semibold">
                Units Transfused
              </Label>
              <Input
                id="units_transfused"
                type="number"
                min="1"
                max="10"
                placeholder="e.g. 2"
                className="bg-slate-950 border-slate-800 focus-visible:ring-rose-500 text-slate-100 h-9"
                {...register("units_transfused")}
              />
              {errors.units_transfused && (
                <span className="text-[10px] text-rose-400 font-semibold block">
                  {errors.units_transfused.message}
                </span>
              )}
            </div>
          )}

          <DialogFooter className="pt-2 flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                reset();
                setIsOpen(false);
              }}
              className="text-xs font-bold text-slate-400 hover:text-slate-200 h-9 rounded-xl hover:bg-slate-850"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={logReadingMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-9 px-4 rounded-xl flex items-center gap-1.5"
            >
              {logReadingMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Save Reading
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
