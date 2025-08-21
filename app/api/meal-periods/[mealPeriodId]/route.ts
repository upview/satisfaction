import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "gel";

const client = createClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ mealPeriodId: string }> }
) {
  try {
    const { mealPeriodId } = await params;

    if (!mealPeriodId) {
      return NextResponse.json(
        { error: "Meal period ID is required" },
        { status: 400 }
      );
    }

    // Delete the meal period completely
    const result = await client.querySingle(
      `
      delete MealPeriod 
      filter .id = <uuid>$mealPeriodId;
    `,
      { mealPeriodId }
    );

    if (!result) {
      return NextResponse.json(
        { error: "Meal period not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Meal period deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting meal period:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}