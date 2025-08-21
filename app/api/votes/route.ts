import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "gel";

const client = createClient();

async function getMealPeriodForTimestamp(timestamp: string) {
  // Extract UTC time as HH:MM format for comparison with UTC meal periods
  const date = new Date(timestamp);
  const utcHours = date.getUTCHours().toString().padStart(2, '0');
  const utcMinutes = date.getUTCMinutes().toString().padStart(2, '0');
  const time = `${utcHours}:${utcMinutes}`;

  const result = await client.querySingle(
    `
    select MealPeriod {
      id,
      name
    } filter .start_time <= <cal::local_time>$time 
      and .end_time >= <cal::local_time>$time
      and .is_active = true
    limit 1;
  `,
    { time }
  );

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");
    const mealPeriod = searchParams.get("mealPeriod");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    let baseQuery = `
      select Device {
        id,
        name,
        votes: {
          id,
          value,
          created_at,
          device: { id, name }
        }
      }
    `;

    let filterConditions = [];
    let queryParams: any = {};

    // Device filter
    if (deviceId) {
      filterConditions.push(".id = <uuid>$deviceId");
      queryParams.deviceId = deviceId;
    }

    // Apply device filter
    if (filterConditions.length > 0) {
      baseQuery += ` filter ${filterConditions.join(" and ")}`;
    }

    const result = await client.query(baseQuery, queryParams);

    // Post-process to filter votes by meal period and date range
    let processedResult = result.map((device: any) => {
      let filteredVotes = device.votes;

      // Filter by date range
      if (dateFrom || dateTo) {
        filteredVotes = filteredVotes.filter((vote: any) => {
          const voteDate = new Date(vote.created_at);
          const fromDate = dateFrom
            ? new Date(dateFrom)
            : new Date("1900-01-01");
          const toDate = dateTo ? new Date(dateTo) : new Date("2100-01-01");
          return voteDate >= fromDate && voteDate <= toDate;
        });
      }

      // Filter by meal period (we'll do this in memory for now)
      if (mealPeriod) {
        // This is a simplified version - in production you'd want to do this in the database
        filteredVotes = filteredVotes.filter((vote: any) => {
          // Extract UTC time for comparison
          const voteDate = new Date(vote.created_at);
          const utcHours = voteDate.getUTCHours().toString().padStart(2, '0');
          const utcMinutes = voteDate.getUTCMinutes().toString().padStart(2, '0');
          const voteTime = `${utcHours}:${utcMinutes}`;
          // You'd need to fetch meal periods and check against them
          // For now, simple time-based filtering
          if (mealPeriod === "breakfast")
            return voteTime >= "07:00" && voteTime <= "10:30";
          if (mealPeriod === "lunch")
            return voteTime >= "11:30" && voteTime <= "14:30";
          if (mealPeriod === "dinner")
            return voteTime >= "18:00" && voteTime <= "21:30";
          return true;
        });
      }

      return {
        ...device,
        votes: filteredVotes,
      };
    });

    if (deviceId) {
      const device = processedResult[0];
      if (!device) {
        return NextResponse.json(
          { error: "Device not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(device);
    }

    return NextResponse.json(processedResult || []);
  } catch (error) {
    console.error("Error fetching data:", error);
    if (request.method === "GET") {
      return NextResponse.json([]);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, voteValue, deviceName, action } = body;

    if (action === "createDevice") {
      // Create device
      if (!deviceName || typeof deviceName !== "string") {
        return NextResponse.json(
          { error: "deviceName is required and must be a string" },
          { status: 400 }
        );
      }

      const result = await client.querySingle(
        `
        insert Device {
          name := <str>$deviceName
        };
      `,
        { deviceName }
      );

      return NextResponse.json(result, { status: 201 });
    }

    // Create vote (existing logic)
    if (!deviceId || typeof deviceId !== "string") {
      return NextResponse.json(
        { error: "deviceId is required and must be a string" },
        { status: 400 }
      );
    }

    if (
      !voteValue ||
      typeof voteValue !== "number" ||
      voteValue < 1 ||
      voteValue > 5
    ) {
      return NextResponse.json(
        { error: "voteValue is required and must be a number between 1 and 5" },
        { status: 400 }
      );
    }

    // Insert the vote using device UUID
    const result = await client.querySingle(
      `
      insert Vote {
        value := <int16>$voteValue,
        device := (select Device filter .id = <uuid>$deviceId)
      };
    `,
      {
        voteValue,
        deviceId,
      }
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating vote or device:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");
    const voteId = searchParams.get("voteId");
    const deleteAllVotes = searchParams.get("deleteAllVotes");

    if (voteId) {
      // Delete a specific vote
      await client.query(
        `
        delete Vote filter .id = <uuid>$voteId;
      `,
        { voteId }
      );

      return NextResponse.json(
        { message: "Vote deleted successfully" },
        { status: 200 }
      );
    } else if (deviceId && deleteAllVotes === "true") {
      // Delete all votes for a device without deleting the device
      await client.query(
        `
        delete Vote filter .device.id = <uuid>$deviceId;
      `,
        { deviceId }
      );

      return NextResponse.json(
        { message: "All votes deleted successfully" },
        { status: 200 }
      );
    } else if (deviceId) {
      // Delete device (votes will be automatically deleted due to cascade)
      await client.query(
        `
        delete Device filter .id = <uuid>$deviceId;
      `,
        { deviceId }
      );

      return NextResponse.json(
        { message: "Device deleted successfully" },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: "deviceId or voteId is required" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error deleting:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
