import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { supabase } from "./lib/supabase";

type User = {
  name: string;
  role: "Admin" | "Employee";
  id: string;
};

type TravelStatus = "Pending" | "Approved" | "Rejected";
type RoomStatus = "Pending" | "Approved" | "Rejected";

type TravelEntry = {
  id: number;
  employeeName: string;
  employeeId: string;
  fromDate: string;
  toDate: string;
  purpose: string;
  showroom: string;
  travelNeeded: "Yes" | "No";
  accommodationNeeded: "Yes" | "No";
  status: TravelStatus;
};

type RoomBooking = {
  id: number;
  employeeName: string;
  employeeId: string;
  fromDate: string;
  toDate: string;
  room: string;
  trainingType: string;
  remarks: string;
  showroom: string;
  status: RoomStatus;
};

type EmployeeRecord = {
  id: string;
  name: string;
  showroom: string;
  password: string;
};

type RoomRecord = {
  id: string;
  name: string;
};

type ModuleKey = "travel" | "room" | "employees" | "showrooms" | "rooms";

type TooltipState = {
  x: number;
  y: number;
  title: string;
  sub1: string;
  sub2: string;
  date: string;
} | null;

type CalendarModal = {
  title: string;
  line1: string;
  line2: string;
  line3: string;
  line4: string;
  line5: string;
} | null;

type CalendarEventShape = {
  id: string;
  title: string;
  start: string;
  allDay: boolean;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    line1: string;
    line2: string;
    line3: string;
    line4: string;
    line5: string;
  };
};

const TRAINING_OPTIONS = [
  "Product Training",
  "Sales Training",
  "Technical Training",
  "HR Training",
  "Others",
];

export default function App() {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

useEffect(() => {
  const onResize = () => setIsMobile(window.innerWidth < 1024);
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
}, []);

  const [activeModule, setActiveModule] = useState<ModuleKey>("travel");

  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [showroomLocations, setShowroomLocations] = useState<string[]>([]);
  const [rooms, setRooms] = useState<RoomRecord[]>([]);

  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeId, setNewEmployeeId] = useState("");
  const [newEmployeePassword, setNewEmployeePassword] = useState("");
  const [newEmployeeShowroom, setNewEmployeeShowroom] = useState("");

  const [newShowroom, setNewShowroom] = useState("");
  const [showroomSearch, setShowroomSearch] = useState("");

  const [newRoomName, setNewRoomName] = useState("");
  const [roomSearch, setRoomSearch] = useState("");

  const [travelEntries, setTravelEntries] = useState<TravelEntry[]>([]);
  const [travelFromDate, setTravelFromDate] = useState("");
  const [travelToDate, setTravelToDate] = useState("");
  const [travelPurpose, setTravelPurpose] = useState("");
  const [travelShowroom, setTravelShowroom] = useState("");
  const [travelNeeded, setTravelNeeded] = useState<"Yes" | "No">("Yes");
  const [accommodationNeeded, setAccommodationNeeded] = useState<"Yes" | "No">("No");

  const [travelFilterMonth, setTravelFilterMonth] = useState("");
  const [travelFilterDate, setTravelFilterDate] = useState("");
  const [travelFilterEmployee, setTravelFilterEmployee] = useState("");

  const [roomBookings, setRoomBookings] = useState<RoomBooking[]>([]);
  const [roomFromDate, setRoomFromDate] = useState("");
  const [roomToDate, setRoomToDate] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [trainingType, setTrainingType] = useState("");
  const [roomRemarks, setRoomRemarks] = useState("");
  const [roomShowroom, setRoomShowroom] = useState("");

  const [roomFilterMonth, setRoomFilterMonth] = useState("");
  const [roomFilterDate, setRoomFilterDate] = useState("");
  const [roomFilterEmployee, setRoomFilterEmployee] = useState("");

  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [calendarModal, setCalendarModal] = useState<CalendarModal>(null);

  const travelCalendarRef = useRef<HTMLDivElement | null>(null);
  const roomCalendarRef = useRef<HTMLDivElement | null>(null);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(""), 2500);
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("portal_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("portal_user");
      }
    }
  }, []);

  const loadAllData = async (showLoader = false) => {
    if (showLoader) setIsLoading(true);

    const [employeesRes, showroomsRes, roomsRes, travelRes, bookingsRes] = await Promise.all([
      supabase
        .from("employees")
        .select("employee_code, name, showroom, password, role")
        .order("name"),
      supabase.from("showrooms").select("id, name").order("name"),
      supabase.from("rooms").select("id, name").order("name"),
      supabase.from("travel_requests").select("*").order("id", { ascending: false }),
      supabase.from("room_bookings").select("*").order("id", { ascending: false }),
    ]);

    if (employeesRes.error) {
      console.error("employees load error", employeesRes.error.message);
    } else {
      const rows = (employeesRes.data ?? []) as Array<{
        employee_code: string;
        name: string;
        showroom: string | null;
        password: string | null;
      }>;
      setEmployees(
        rows.map((emp) => ({
          id: emp.employee_code,
          name: emp.name,
          showroom: emp.showroom || "",
          password: emp.password || "",
        }))
      );
    }

    if (showroomsRes.error) {
      console.error("showrooms load error", showroomsRes.error.message);
    } else {
      const rows = (showroomsRes.data ?? []) as Array<{ id: number; name: string }>;
      setShowroomLocations(rows.map((row) => row.name));
    }

    if (roomsRes.error) {
      console.error("rooms load error", roomsRes.error.message);
    } else {
      const rows = (roomsRes.data ?? []) as Array<{ id: number; name: string }>;
      setRooms(
        rows.map((row) => ({
          id: String(row.id),
          name: row.name,
        }))
      );
    }

    if (travelRes.error) {
      console.error("travel load error", travelRes.error.message);
    } else {
      const rows = (travelRes.data ?? []) as Array<{
        id: number;
        employee_name: string;
        employee_id: string;
        from_date: string;
        to_date: string;
        purpose: string;
        showroom: string | null;
        travel_needed: boolean;
        accommodation_needed: boolean;
        status: TravelStatus;
      }>;
      setTravelEntries(
        rows.map((row) => ({
          id: row.id,
          employeeName: row.employee_name,
          employeeId: row.employee_id,
          fromDate: row.from_date,
          toDate: row.to_date,
          purpose: row.purpose,
          showroom: row.showroom || "",
          travelNeeded: row.travel_needed ? "Yes" : "No",
          accommodationNeeded: row.accommodation_needed ? "Yes" : "No",
          status: row.status,
        }))
      );
    }

    if (bookingsRes.error) {
      console.error("room bookings load error", bookingsRes.error.message);
    } else {
      const rows = (bookingsRes.data ?? []) as Array<{
        id: number;
        employee_name: string;
        employee_id: string;
        from_date: string;
        to_date: string;
        room: string;
        training_type: string;
        remarks: string | null;
        showroom: string | null;
        status: RoomStatus;
      }>;
      setRoomBookings(
        rows.map((row) => ({
          id: row.id,
          employeeName: row.employee_name,
          employeeId: row.employee_id,
          fromDate: row.from_date,
          toDate: row.to_date,
          room: row.room,
          trainingType: row.training_type,
          remarks: row.remarks || "",
          showroom: row.showroom || "",
          status: row.status,
        }))
      );
    }

    if (showLoader) setIsLoading(false);
  };

  useEffect(() => {
    void loadAllData(true);
  }, []);

  const filteredShowroomOptions = useMemo(() => {
    if (!showroomSearch.trim()) return showroomLocations;
    return showroomLocations.filter((item) =>
      item.toLowerCase().includes(showroomSearch.trim().toLowerCase())
    );
  }, [showroomLocations, showroomSearch]);

  const filteredRooms = useMemo(() => {
    if (!roomSearch.trim()) return rooms;
    return rooms.filter((room) =>
      room.name.toLowerCase().includes(roomSearch.trim().toLowerCase())
    );
  }, [rooms, roomSearch]);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (name.trim() === "Rathishthambu" && id.trim() === "landd2026") {
      const adminUser = {
        name: "Rathishthambu",
        role: "Admin" as const,
        id: "admin",
      };
      setUser(adminUser);
      localStorage.setItem("portal_user", JSON.stringify(adminUser));
      return;
    }

    if (!name.trim() || !id.trim()) {
      setError("Enter username and password");
      return;
    }

    const matchedEmployee = employees.find(
      (emp) =>
        emp.name.trim().toLowerCase() === name.trim().toLowerCase() &&
        emp.password === id.trim()
    );

    if (!matchedEmployee) {
      setError("Invalid username or password");
      return;
    }

    const employeeUser = {
      name: matchedEmployee.name,
      role: "Employee" as const,
      id: matchedEmployee.id,
    };

    setUser(employeeUser);
    localStorage.setItem("portal_user", JSON.stringify(employeeUser));
  };

  const logout = () => {
    setUser(null);
    setName("");
    setId("");
    setError("");
    setActiveModule("travel");
    setTooltip(null);
    setCalendarModal(null);
    localStorage.removeItem("portal_user");
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !newEmployeeName.trim() ||
      !newEmployeeId.trim() ||
      !newEmployeePassword.trim()
    ) {
      alert("Enter employee name, ID and password");
      return;
    }

    const alreadyExists = employees.some(
      (emp) => emp.id.toLowerCase() === newEmployeeId.trim().toLowerCase()
    );

    if (alreadyExists) {
      alert("Employee ID already exists.");
      return;
    }

    const { error: insertError } = await supabase.from("employees").insert({
      employee_code: newEmployeeId.trim(),
      name: newEmployeeName.trim(),
      showroom: newEmployeeShowroom.trim() || null,
      password: newEmployeePassword.trim(),
      role: "Employee",
    });

    if (insertError) {
      alert(insertError.message);
      return;
    }

    setNewEmployeeName("");
    setNewEmployeeId("");
    setNewEmployeePassword("");
    setNewEmployeeShowroom("");

    await loadAllData(false);
    showSuccess("Employee saved");
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    const { error: deleteError } = await supabase
      .from("employees")
      .delete()
      .eq("employee_code", employeeId);

    if (deleteError) {
      alert(deleteError.message);
      return;
    }

    await loadAllData(false);
    showSuccess("Employee deleted");
  };

  const handleAddShowroom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newShowroom.trim()) {
      alert("Enter showroom location.");
      return;
    }

    const exists = showroomLocations.some(
      (item) => item.toLowerCase() === newShowroom.trim().toLowerCase()
    );

    if (exists) {
      alert("Showroom already exists.");
      return;
    }

    const { error: insertError } = await supabase.from("showrooms").insert({
      name: newShowroom.trim(),
    });

    if (insertError) {
      alert(insertError.message);
      return;
    }

    setNewShowroom("");
    await loadAllData(false);
    showSuccess("Showroom saved");
  };

  const handleDeleteShowroom = async (showroom: string) => {
    const { error: deleteError } = await supabase
      .from("showrooms")
      .delete()
      .eq("name", showroom);

    if (deleteError) {
      alert(deleteError.message);
      return;
    }

    await loadAllData(false);
    showSuccess("Showroom deleted");
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newRoomName.trim()) {
      alert("Enter room name.");
      return;
    }

    const exists = rooms.some(
      (room) => room.name.toLowerCase() === newRoomName.trim().toLowerCase()
    );

    if (exists) {
      alert("Room already exists.");
      return;
    }

    const { error: insertError } = await supabase.from("rooms").insert({
      name: newRoomName.trim(),
    });

    if (insertError) {
      alert(insertError.message);
      return;
    }

    setNewRoomName("");
    await loadAllData(false);
    showSuccess("Room saved");
  };

  const handleDeleteRoom = async (roomId: string) => {
    const roomToDelete = rooms.find((room) => room.id === roomId);
    if (!roomToDelete) return;

    const { error: deleteError } = await supabase
      .from("rooms")
      .delete()
      .eq("name", roomToDelete.name);

    if (deleteError) {
      alert(deleteError.message);
      return;
    }

    await loadAllData(false);
    showSuccess("Room deleted");
  };

  const handleShowroomExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (event) => {
      const data = event.target?.result;
      if (!data) return;

      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);

      const uploadedValues: string[] = [];

      rows.forEach((row) => {
        const keys = Object.keys(row);
        if (keys.length === 0) return;

        const showroomValue =
          row["Showroom"] ??
          row["Showroom Location"] ??
          row["Location"] ??
          row[keys[0]];

        if (typeof showroomValue === "string" && showroomValue.trim()) {
          uploadedValues.push(showroomValue.trim());
        }
      });

      if (uploadedValues.length === 0) {
        alert("No showroom values found in the Excel file.");
        return;
      }

      const uniqueValues = Array.from(new Set(uploadedValues));

      const { error: upsertError } = await supabase
        .from("showrooms")
        .upsert(uniqueValues.map((nameValue) => ({ name: nameValue })), {
          onConflict: "name",
          ignoreDuplicates: true,
        });

      if (upsertError) {
        alert(upsertError.message);
        return;
      }

      await loadAllData(false);
      showSuccess("Showroom Excel uploaded");
    };

    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleTravelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!travelFromDate || !travelToDate || !travelPurpose.trim()) {
      alert("Fill all travel fields.");
      return;
    }

    if (travelToDate < travelFromDate) {
      alert("To date should not be before from date.");
      return;
    }

    const { error: insertError } = await supabase.from("travel_requests").insert({
      employee_name: user.name,
      employee_id: user.id,
      from_date: travelFromDate,
      to_date: travelToDate,
      purpose: travelPurpose.trim(),
      showroom: travelShowroom.trim() || null,
      travel_needed: travelNeeded === "Yes",
      accommodation_needed: accommodationNeeded === "Yes",
      status: "Pending",
    });

    if (insertError) {
      alert(insertError.message);
      return;
    }

    setTravelFromDate("");
    setTravelToDate("");
    setTravelPurpose("");
    setTravelShowroom("");
    setTravelNeeded("Yes");
    setAccommodationNeeded("No");

    await loadAllData(false);
    showSuccess("Travel request submitted");
  };

  const handleRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!roomFromDate || !roomToDate || !selectedRoom || !trainingType) {
      alert("Fill all room booking fields.");
      return;
    }

    if (roomToDate < roomFromDate) {
      alert("To date should not be before from date.");
      return;
    }

    if (trainingType === "Others" && !roomRemarks.trim()) {
      alert('Remarks are required when training type is "Others".');
      return;
    }

    const { error: insertError } = await supabase.from("room_bookings").insert({
      employee_name: user.name,
      employee_id: user.id,
      from_date: roomFromDate,
      to_date: roomToDate,
      room: selectedRoom,
      training_type: trainingType,
      remarks: roomRemarks.trim() || null,
      showroom: roomShowroom.trim() || null,
      status: "Pending",
    });

    if (insertError) {
      alert(insertError.message);
      return;
    }

    setRoomFromDate("");
    setRoomToDate("");
    setSelectedRoom("");
    setTrainingType("");
    setRoomRemarks("");
    setRoomShowroom("");

    await loadAllData(false);
    showSuccess("Room booking submitted");
  };

  const visibleTravelEntries = useMemo(() => {
    if (!user) return [];

    let entries =
      user.role === "Admin"
        ? [...travelEntries]
        : travelEntries.filter((item) => item.employeeId === user.id);

    if (travelFilterMonth) {
      entries = entries.filter(
        (item) =>
          item.fromDate.startsWith(travelFilterMonth) ||
          item.toDate.startsWith(travelFilterMonth)
      );
    }

    if (travelFilterDate) {
      entries = entries.filter(
        (item) =>
          travelFilterDate >= item.fromDate && travelFilterDate <= item.toDate
      );
    }

    if (user.role === "Admin" && travelFilterEmployee.trim()) {
      entries = entries.filter((item) =>
        item.employeeName
          .toLowerCase()
          .includes(travelFilterEmployee.trim().toLowerCase())
      );
    }

    return entries;
  }, [travelEntries, travelFilterMonth, travelFilterDate, travelFilterEmployee, user]);

  const visibleRoomBookings = useMemo(() => {
    if (!user) return [];

    let entries =
      user.role === "Admin"
        ? [...roomBookings]
        : roomBookings.filter((item) => item.employeeId === user.id);

    if (roomFilterMonth) {
      entries = entries.filter(
        (item) =>
          item.fromDate.startsWith(roomFilterMonth) ||
          item.toDate.startsWith(roomFilterMonth)
      );
    }

    if (roomFilterDate) {
      entries = entries.filter(
        (item) => roomFilterDate >= item.fromDate && roomFilterDate <= item.toDate
      );
    }

    if (user.role === "Admin" && roomFilterEmployee.trim()) {
      entries = entries.filter((item) =>
        item.employeeName
          .toLowerCase()
          .includes(roomFilterEmployee.trim().toLowerCase())
      );
    }

    return entries;
  }, [roomBookings, roomFilterMonth, roomFilterDate, roomFilterEmployee, user]);

  const travelCalendarEvents = useMemo<CalendarEventShape[]>(() => {
    const events: CalendarEventShape[] = [];

    visibleTravelEntries
      .filter((entry) => entry.status === "Approved")
      .forEach((entry) => {
        const colors = getTravelPurposeColors(entry.purpose);
        const current = new Date(entry.fromDate);
        const end = new Date(entry.toDate);

        while (current <= end) {
          const isoDate = toIsoDate(current);

          events.push({
            id: `travel-${entry.id}-${isoDate}`,
            title: entry.employeeName,
            start: isoDate,
            allDay: true,
            backgroundColor: colors.bg,
            borderColor: colors.border,
            textColor: colors.text,
            extendedProps: {
              line1: `Purpose: ${entry.purpose}`,
              line2: `Travel Needed: ${entry.travelNeeded}`,
              line3: `Accommodation Needed: ${entry.accommodationNeeded}`,
              line4: `Showroom: ${entry.showroom || "-"}`,
              line5: `Range: ${entry.fromDate} to ${entry.toDate}`,
            },
          });

          current.setDate(current.getDate() + 1);
        }
      });

    return events;
  }, [visibleTravelEntries]);

  const roomCalendarEvents = useMemo<CalendarEventShape[]>(() => {
    const events: CalendarEventShape[] = [];

    visibleRoomBookings
      .filter((entry) => entry.status === "Approved")
      .forEach((entry) => {
        const colors = getRoomStatusColors(entry.status);
        const current = new Date(entry.fromDate);
        const end = new Date(entry.toDate);

        while (current <= end) {
          const isoDate = toIsoDate(current);

          events.push({
            id: `room-${entry.id}-${isoDate}`,
            title: entry.employeeName,
            start: isoDate,
            allDay: true,
            backgroundColor: colors.bg,
            borderColor: colors.border,
            textColor: colors.text,
            extendedProps: {
              line1: `Room: ${entry.room}`,
              line2: `Training: ${entry.trainingType}`,
              line3: `Remarks: ${entry.remarks || "-"}`,
              line4: `Showroom: ${entry.showroom || "-"}`,
              line5: `Range: ${entry.fromDate} to ${entry.toDate}`,
            },
          });

          current.setDate(current.getDate() + 1);
        }
      });

    return events;
  }, [visibleRoomBookings]);

  const updateTravelStatus = async (entryId: number, status: TravelStatus) => {
    const { error: updateError } = await supabase
      .from("travel_requests")
      .update({ status })
      .eq("id", entryId);

    if (updateError) {
      alert(updateError.message);
      return;
    }

    setTravelEntries((prev) =>
      prev.map((item) => (item.id === entryId ? { ...item, status } : item))
    );
    showSuccess("Travel status updated");
  };

  const updateRoomStatus = async (entryId: number, status: RoomStatus) => {
    const { error: updateError } = await supabase
      .from("room_bookings")
      .update({ status })
      .eq("id", entryId);

    if (updateError) {
      alert(updateError.message);
      return;
    }

    setRoomBookings((prev) =>
      prev.map((item) => (item.id === entryId ? { ...item, status } : item))
    );
    showSuccess("Room status updated");
  };

  const downloadCalendarPdf = async (
    ref: React.RefObject<HTMLDivElement | null>,
    title: string,
    fileName: string
  ) => {
    if (!ref.current) return;

    const canvas = await html2canvas(ref.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 10;

    pdf.setFontSize(16);
    pdf.text(title, margin, 12);

    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - 24;
    const ratio = Math.min(
      usableWidth / canvas.width,
      usableHeight / canvas.height
    );

    const imgWidth = canvas.width * ratio;
    const imgHeight = canvas.height * ratio;

    pdf.addImage(imgData, "PNG", margin, 18, imgWidth, imgHeight);
    pdf.save(fileName);
  };

  if (isLoading) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>
          <h1 style={styles.loginTitle}>Loading...</h1>
          <p style={styles.loginSub}>Please wait</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.loginPage}>
        <form onSubmit={login} style={styles.loginCard}>
          <h1 style={styles.loginTitle}>Employee Portal</h1>
          <p style={styles.loginSub}>Login with username and password</p>

          <input
            style={styles.input}
            placeholder="Username"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            style={styles.input}
            placeholder="Password"
            type="password"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />

          <button type="submit" style={styles.primaryButton}>
            Login
          </button>

          {error ? <p style={styles.errorText}>{error}</p> : null}
        </form>
      </div>
    );
  }

  return (
   <div
    style={{
      ...styles.appShell,
      flexDirection: isMobile ? "column": "row",
    }}
  >
      <aside
  style={{
    ...styles.sidebar,
    width: isMobile ? "100%" : 300,
    minWidth: isMobile ? "100%" : 300,
    minHeight: isMobile ? "auto" : "100vh",
    position: isMobile ? "relative" : "sticky",
  }}
>
        <div>
          <div style={styles.brandBox}>
            <div style={styles.brandTitle}>Portal</div>
            <div style={styles.brandSub}>{user.role}</div>
          </div>

          <div style={styles.sideUserBox}>
            <div style={styles.sideUserName}>{user.name}</div>
            <div style={styles.sideUserId}>{user.id}</div>
          </div>

          <nav style={styles.navList}>
            <SidebarButton
              label="Travel Planner"
              active={activeModule === "travel"}
              onClick={() => setActiveModule("travel")}
            />
            <SidebarButton
              label="Room Booking"
              active={activeModule === "room"}
              onClick={() => setActiveModule("room")}
            />
            {user.role === "Admin" && (
              <>
                <SidebarButton
                  label="Employees"
                  active={activeModule === "employees"}
                  onClick={() => setActiveModule("employees")}
                />
                <SidebarButton
                  label="Showroom Locations"
                  active={activeModule === "showrooms"}
                  onClick={() => setActiveModule("showrooms")}
                />
                <SidebarButton
                  label="Rooms"
                  active={activeModule === "rooms"}
                  onClick={() => setActiveModule("rooms")}
                />
              </>
            )}
          </nav>
        </div>

        <button onClick={logout} style={styles.logoutButton}>
          Logout
        </button>
      </aside>

      <main
  style={{
    ...styles.main,
    padding: isMobile ? "16px" : "24px",
  }}
>
        {successMessage ? <div style={styles.successBanner}>{successMessage}</div> : null}

        {activeModule === "travel" && (
          <>
            <SectionCard title="Travel Planner">
              {user.role !== "Admin" && (
                <form onSubmit={handleTravelSubmit} style={styles.formGrid}>
                  <Field label="From date">
                    <input
                      type="date"
                      style={styles.input}
                      value={travelFromDate}
                      onChange={(e) => setTravelFromDate(e.target.value)}
                    />
                  </Field>

                  <Field label="To date">
                    <input
                      type="date"
                      style={styles.input}
                      value={travelToDate}
                      onChange={(e) => setTravelToDate(e.target.value)}
                    />
                  </Field>

                  <Field label="Purpose">
                    <select
                      style={styles.input}
                      value={travelPurpose}
                      onChange={(e) => setTravelPurpose(e.target.value)}
                    >
                      <option value="">Select purpose</option>
                      <option value="Showroom visit">Showroom visit</option>
                      <option value="Training">Training</option>
                      <option value="Others">Others</option>
                    </select>
                  </Field>

                  <Field label="Travel needed">
                    <select
                      style={styles.input}
                      value={travelNeeded}
                      onChange={(e) => setTravelNeeded(e.target.value as "Yes" | "No")}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </Field>

                  <Field label="Accommodation needed">
                    <select
                      style={styles.input}
                      value={accommodationNeeded}
                      onChange={(e) =>
                        setAccommodationNeeded(e.target.value as "Yes" | "No")
                      }
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </Field>

                  <Field label="Showroom (searchable)">
                    <input
                      list="travel-showrooms"
                      style={styles.input}
                      value={travelShowroom}
                      onChange={(e) => setTravelShowroom(e.target.value)}
                      placeholder="Type to search showroom"
                    />
                    <datalist id="travel-showrooms">
                      {showroomLocations.map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                  </Field>

                  <div style={styles.fullRow}>
                    <button type="submit" style={styles.primaryButton}>
                      Submit Travel Request
                    </button>
                  </div>
                </form>
              )}
            </SectionCard>

            <SectionCard title={user.role === "Admin" ? "All Travel Entries" : "My Travel Entries"}>
              <div style={styles.filterGrid}>
                <Field label="Filter by month">
                  <input
                    type="month"
                    style={styles.input}
                    value={travelFilterMonth}
                    onChange={(e) => setTravelFilterMonth(e.target.value)}
                  />
                </Field>

                <Field label="Filter by exact date">
                  <input
                    type="date"
                    style={styles.input}
                    value={travelFilterDate}
                    onChange={(e) => setTravelFilterDate(e.target.value)}
                  />
                </Field>

                {user.role === "Admin" && (
                  <Field label="Filter by employee name">
                    <input
                      type="text"
                      style={styles.input}
                      value={travelFilterEmployee}
                      onChange={(e) => setTravelFilterEmployee(e.target.value)}
                      placeholder="Employee name"
                    />
                  </Field>
                )}

                <div style={styles.filterAction}>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => {
                      setTravelFilterMonth("");
                      setTravelFilterDate("");
                      setTravelFilterEmployee("");
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              <DataTable
                headers={[
                  "Employee",
                  "Date Range",
                  "Purpose",
                  "Travel Needed",
                  "Accommodation Needed",
                  "Showroom",
                  "Status",
                  ...(user.role === "Admin" ? ["Actions"] : []),
                ]}
                emptyText="No travel entries found."
              >
                {visibleTravelEntries.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>{item.employeeName}</td>
                    <td style={{ ...styles.td, whiteSpace: "normal" }}>
                      {item.fromDate} to {item.toDate}
                    </td>
                    <td style={styles.td}>{item.purpose}</td>
                    <td style={styles.td}>{item.travelNeeded}</td>
                    <td style={styles.td}>{item.accommodationNeeded}</td>
                    <td style={styles.td}>{item.showroom || "-"}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          ...getStatusBadgeStyle(item.status),
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    {user.role === "Admin" && (
                      <td style={styles.td}>
                        <div style={styles.actionWrap}>
                          <button
                            style={styles.approveButton}
                            onClick={() => void updateTravelStatus(item.id, "Approved")}
                          >
                            Approve
                          </button>
                          <button
                            style={styles.rejectButton}
                            onClick={() => void updateTravelStatus(item.id, "Rejected")}
                          >
                            Reject
                          </button>
                          {item.status === "Approved" && (
                            <button
                              style={styles.revokeButton}
                              onClick={() => void updateTravelStatus(item.id, "Pending")}
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </DataTable>
            </SectionCard>

            <SectionCard
              title="Travel Calendar"
              action={
                <button
                  style={styles.primaryButton}
                  onClick={() =>
                    void downloadCalendarPdf(
                      travelCalendarRef,
                      "Travel Calendar",
                      "travel-calendar.pdf"
                    )
                  }
                >
                  Download PDF
                </button>
              }
            >
              <p style={styles.legendText}>
                Only approved travel entries appear in the calendar.
              </p>

              <div ref={travelCalendarRef} style={styles.calendarExportBox}>
                <div style={styles.exportTitle}>Travel Calendar</div>
                <FullCalendar
                  plugins={[dayGridPlugin]}
                  initialView="dayGridMonth"
                  height="auto"
                  events={travelCalendarEvents}
                  eventContent={(info) => (
                    <div style={styles.fcEventBox}>
                      <div style={styles.fcTitle}>{info.event.title}</div>
                      <div style={styles.fcLine}>
                        {String(info.event.extendedProps.line1).replace("Purpose: ", "")}
                      </div>
                      <div style={styles.fcLine}>
                        {String(info.event.extendedProps.line2).replace(
                          "Travel Needed: ",
                          ""
                        )}
                      </div>
                    </div>
                  )}
                  eventClick={(info) => {
                    setCalendarModal({
                      title: info.event.title,
                      line1: String(info.event.extendedProps.line1),
                      line2: String(info.event.extendedProps.line2),
                      line3: String(info.event.extendedProps.line3),
                      line4: String(info.event.extendedProps.line4),
                      line5: String(info.event.extendedProps.line5),
                    });
                  }}
                  eventMouseEnter={(info) => {
                    setTooltip({
                      x: info.jsEvent.clientX + 12,
                      y: info.jsEvent.clientY + 12,
                      title: info.event.title,
                      sub1: String(info.event.extendedProps.line1),
                      sub2: String(info.event.extendedProps.line2),
                      date: info.event.startStr,
                    });
                  }}
                  eventMouseLeave={() => setTooltip(null)}
                />
              </div>
            </SectionCard>
          </>
        )}

        {activeModule === "room" && (
          <>
            <SectionCard title="Room Booking">
              {user.role !== "Admin" && (
                <form onSubmit={handleRoomSubmit} style={styles.formGrid}>
                  <Field label="From date">
                    <input
                      type="date"
                      style={styles.input}
                      value={roomFromDate}
                      onChange={(e) => setRoomFromDate(e.target.value)}
                    />
                  </Field>

                  <Field label="To date">
                    <input
                      type="date"
                      style={styles.input}
                      value={roomToDate}
                      onChange={(e) => setRoomToDate(e.target.value)}
                    />
                  </Field>

                  <Field label="Room selection">
                    <select
                      style={styles.input}
                      value={selectedRoom}
                      onChange={(e) => setSelectedRoom(e.target.value)}
                    >
                      <option value="">Select room</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.name}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Training type">
                    <select
                      style={styles.input}
                      value={trainingType}
                      onChange={(e) => setTrainingType(e.target.value)}
                    >
                      <option value="">Select training type</option>
                      {TRAINING_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Showroom (searchable)">
                    <input
                      list="room-showrooms"
                      style={styles.input}
                      value={roomShowroom}
                      onChange={(e) => setRoomShowroom(e.target.value)}
                      placeholder="Type to search showroom"
                    />
                    <datalist id="room-showrooms">
                      {showroomLocations.map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                  </Field>

                  <Field label={`Remarks ${trainingType === "Others" ? "(Required)" : ""}`}>
                    <input
                      type="text"
                      style={styles.input}
                      value={roomRemarks}
                      onChange={(e) => setRoomRemarks(e.target.value)}
                      placeholder="Enter remarks"
                    />
                  </Field>

                  <div style={styles.fullRow}>
                    <button type="submit" style={styles.primaryButton}>
                      Submit Room Booking
                    </button>
                  </div>
                </form>
              )}
            </SectionCard>

            <SectionCard title={user.role === "Admin" ? "All Room Bookings" : "My Room Bookings"}>
              <div style={styles.filterGrid}>
                <Field label="Filter by month">
                  <input
                    type="month"
                    style={styles.input}
                    value={roomFilterMonth}
                    onChange={(e) => setRoomFilterMonth(e.target.value)}
                  />
                </Field>

                <Field label="Filter by exact date">
                  <input
                    type="date"
                    style={styles.input}
                    value={roomFilterDate}
                    onChange={(e) => setRoomFilterDate(e.target.value)}
                  />
                </Field>

                {user.role === "Admin" && (
                  <Field label="Filter by employee name">
                    <input
                      type="text"
                      style={styles.input}
                      value={roomFilterEmployee}
                      onChange={(e) => setRoomFilterEmployee(e.target.value)}
                      placeholder="Employee name"
                    />
                  </Field>
                )}

                <div style={styles.filterAction}>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => {
                      setRoomFilterMonth("");
                      setRoomFilterDate("");
                      setRoomFilterEmployee("");
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              <DataTable
                headers={[
                  "Employee",
                  "Date Range",
                  "Room",
                  "Training Type",
                  "Remarks",
                  "Showroom",
                  "Status",
                  ...(user.role === "Admin" ? ["Actions"] : []),
                ]}
                emptyText="No room bookings found."
              >
                {visibleRoomBookings.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>{item.employeeName}</td>
                    <td style={{ ...styles.td, whiteSpace: "normal" }}>
                      {item.fromDate} to {item.toDate}
                    </td>
                    <td style={styles.td}>{item.room}</td>
                    <td style={styles.td}>{item.trainingType}</td>
                    <td style={styles.td}>{item.remarks || "-"}</td>
                    <td style={styles.td}>{item.showroom || "-"}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          ...getStatusBadgeStyle(item.status),
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    {user.role === "Admin" && (
                      <td style={styles.td}>
                        <div style={styles.actionWrap}>
                          <button
                            style={styles.approveButton}
                            onClick={() => void updateRoomStatus(item.id, "Approved")}
                          >
                            Approve
                          </button>
                          <button
                            style={styles.rejectButton}
                            onClick={() => void updateRoomStatus(item.id, "Rejected")}
                          >
                            Reject
                          </button>
                          <button
                            style={styles.revokeButton}
                            onClick={() => void updateRoomStatus(item.id, "Pending")}
                          >
                            Revoke
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </DataTable>
            </SectionCard>

            <SectionCard
              title="Room Booking Calendar"
              action={
                <button
                  style={styles.primaryButton}
                  onClick={() =>
                    void downloadCalendarPdf(
                      roomCalendarRef,
                      "Room Booking",
                      "room-booking-calendar.pdf"
                    )
                  }
                >
                  Download PDF
                </button>
              }
            >
              <p style={styles.legendText}>
                Only approved room bookings appear in the calendar.
              </p>

              <div ref={roomCalendarRef} style={styles.calendarExportBox}>
                <div style={styles.exportTitle}>Room Booking</div>
                <FullCalendar
                  plugins={[dayGridPlugin]}
                  initialView="dayGridMonth"
                  height="auto"
                  events={roomCalendarEvents}
                  eventContent={(info) => (
                    <div style={styles.fcEventBox}>
                      <div style={styles.fcTitle}>{info.event.title}</div>
                      <div style={styles.fcLine}>
                        {String(info.event.extendedProps.line1).replace("Room: ", "")}
                      </div>
                      <div style={styles.fcLine}>
                        {String(info.event.extendedProps.line2).replace("Training: ", "")}
                      </div>
                    </div>
                  )}
                  eventClick={(info) => {
                    setCalendarModal({
                      title: info.event.title,
                      line1: String(info.event.extendedProps.line1),
                      line2: String(info.event.extendedProps.line2),
                      line3: String(info.event.extendedProps.line3),
                      line4: String(info.event.extendedProps.line4),
                      line5: String(info.event.extendedProps.line5),
                    });
                  }}
                  eventMouseEnter={(info) => {
                    setTooltip({
                      x: info.jsEvent.clientX + 12,
                      y: info.jsEvent.clientY + 12,
                      title: info.event.title,
                      sub1: String(info.event.extendedProps.line1),
                      sub2: String(info.event.extendedProps.line2),
                      date: info.event.startStr,
                    });
                  }}
                  eventMouseLeave={() => setTooltip(null)}
                />
              </div>
            </SectionCard>
          </>
        )}

        {activeModule === "employees" && user.role === "Admin" && (
          <>
            <SectionCard title="Add Employee">
              <form onSubmit={handleAddEmployee} style={styles.formGrid}>
                <Field label="Employee name">
                  <input
                    style={styles.input}
                    value={newEmployeeName}
                    onChange={(e) => setNewEmployeeName(e.target.value)}
                    placeholder="Enter employee name"
                  />
                </Field>

                <Field label="Employee ID">
                  <input
                    style={styles.input}
                    value={newEmployeeId}
                    onChange={(e) => setNewEmployeeId(e.target.value)}
                    placeholder="Enter employee ID"
                  />
                </Field>

                <Field label="Employee password">
                  <input
                    style={styles.input}
                    value={newEmployeePassword}
                    onChange={(e) => setNewEmployeePassword(e.target.value)}
                    placeholder="Enter employee password"
                    type="password"
                  />
                </Field>

                <Field label="Showroom (searchable)">
                  <input
                    list="employee-showrooms"
                    style={styles.input}
                    value={newEmployeeShowroom}
                    onChange={(e) => setNewEmployeeShowroom(e.target.value)}
                    placeholder="Type to search showroom"
                  />
                  <datalist id="employee-showrooms">
                    {showroomLocations.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </Field>

                <div style={styles.fullRow}>
                  <button type="submit" style={styles.primaryButton}>
                    Add Employee
                  </button>
                </div>
              </form>
            </SectionCard>

            <SectionCard title="Employee List">
              <DataTable
                headers={[
                  "Employee Name",
                  "Employee ID",
                  "Password",
                  "Showroom",
                  "Actions",
                ]}
                emptyText="No employees found."
              >
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td style={styles.td}>{emp.name}</td>
                    <td style={styles.td}>{emp.id}</td>
                    <td style={styles.td}>{emp.password}</td>
                    <td style={styles.td}>{emp.showroom || "-"}</td>
                    <td style={styles.td}>
                      <button
                        style={styles.rejectButton}
                        onClick={() => void handleDeleteEmployee(emp.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </DataTable>
            </SectionCard>
          </>
        )}

        {activeModule === "showrooms" && user.role === "Admin" && (
          <>
            <SectionCard title="Add Showroom Location">
              <form onSubmit={handleAddShowroom} style={styles.formGrid}>
                <Field label="Showroom location">
                  <input
                    style={styles.input}
                    value={newShowroom}
                    onChange={(e) => setNewShowroom(e.target.value)}
                    placeholder="Add showroom location"
                  />
                </Field>

                <Field label="Search showroom">
                  <input
                    style={styles.input}
                    value={showroomSearch}
                    onChange={(e) => setShowroomSearch(e.target.value)}
                    placeholder="Search showroom"
                  />
                </Field>

                <Field label="Bulk upload Excel">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleShowroomExcelUpload}
                    style={styles.input}
                  />
                </Field>

                <div style={styles.fullRow}>
                  <button type="submit" style={styles.primaryButton}>
                    Add Showroom
                  </button>
                </div>
              </form>
            </SectionCard>

            <SectionCard title="Showroom List">
              <DataTable
                headers={["Showroom", "Actions"]}
                emptyText="No showroom locations found."
              >
                {filteredShowroomOptions.map((item) => (
                  <tr key={item}>
                    <td style={styles.td}>{item}</td>
                    <td style={styles.td}>
                      <button
                        style={styles.rejectButton}
                        onClick={() => void handleDeleteShowroom(item)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </DataTable>
            </SectionCard>
          </>
        )}

        {activeModule === "rooms" && user.role === "Admin" && (
          <>
            <SectionCard title="Add Room">
              <form onSubmit={handleAddRoom} style={styles.formGrid}>
                <Field label="Room name">
                  <input
                    style={styles.input}
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Enter room name"
                  />
                </Field>

                <Field label="Search room">
                  <input
                    style={styles.input}
                    value={roomSearch}
                    onChange={(e) => setRoomSearch(e.target.value)}
                    placeholder="Search room"
                  />
                </Field>

                <div style={styles.fullRow}>
                  <button type="submit" style={styles.primaryButton}>
                    Add Room
                  </button>
                </div>
              </form>
            </SectionCard>

            <SectionCard title="Room List">
              <DataTable
                headers={["Room Name", "Actions"]}
                emptyText="No rooms found."
              >
                {filteredRooms.map((room) => (
                  <tr key={room.id}>
                    <td style={styles.td}>{room.name}</td>
                    <td style={styles.td}>
                      <button
                        style={styles.rejectButton}
                        onClick={() => void handleDeleteRoom(room.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </DataTable>
            </SectionCard>
          </>
        )}
      </main>

      {tooltip && (
        <div
          style={{
            ...styles.tooltip,
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          <div style={styles.tooltipTitle}>{tooltip.title}</div>
          <div>{tooltip.sub1}</div>
          <div>{tooltip.sub2}</div>
          <div>{tooltip.date}</div>
        </div>
      )}

      {calendarModal && (
        <div style={styles.modalOverlay} onClick={() => setCalendarModal(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>{calendarModal.title}</h3>
            <p style={styles.modalLine}>{calendarModal.line1}</p>
            <p style={styles.modalLine}>{calendarModal.line2}</p>
            <p style={styles.modalLine}>{calendarModal.line3}</p>
            <p style={styles.modalLine}>{calendarModal.line4}</p>
            <p style={styles.modalLine}>{calendarModal.line5}</p>
            <button style={styles.primaryButton} onClick={() => setCalendarModal(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.sidebarButton,
        ...(active ? styles.sidebarButtonActive : {}),
      }}
    >
      {label}
    </button>
  );
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={styles.fieldWrap}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

function DataTable({
  headers,
  emptyText,
  children,
}: {
  headers: string[];
  emptyText: string;
  children: React.ReactNode;
}) {
  const rows = Array.isArray(children) ? children : [children];
  const hasRows = rows.some(Boolean);

  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            {headers.map((head) => (
              <th key={head} style={styles.th}>
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hasRows ? (
            children
          ) : (
            <tr>
              <td style={styles.td} colSpan={headers.length}>
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function toIsoDate(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const year = copy.getFullYear();
  const month = String(copy.getMonth() + 1).padStart(2, "0");
  const day = String(copy.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTravelPurposeColors(purpose: string) {
  const value = purpose.toLowerCase();

  if (value.includes("showroom")) {
    return { bg: "#2563eb", border: "#1d4ed8", text: "#ffffff" };
  }
  if (value.includes("training")) {
    return { bg: "#16a34a", border: "#15803d", text: "#ffffff" };
  }
  return { bg: "#facc15", border: "#eab308", text: "#1f2937" };
}

function getRoomStatusColors(status: RoomStatus) {
  if (status === "Approved") {
    return { bg: "#16a34a", border: "#15803d", text: "#ffffff" };
  }
  if (status === "Rejected") {
    return { bg: "#dc2626", border: "#b91c1c", text: "#ffffff" };
  }
  return { bg: "#2563eb", border: "#1d4ed8", text: "#ffffff" };
}

function getStatusBadgeStyle(status: string): React.CSSProperties {
  if (status === "Approved") {
    return {
      background: "#dcfce7",
      color: "#166534",
      border: "1px solid #86efac",
    };
  }

  if (status === "Rejected") {
    return {
      background: "#fee2e2",
      color: "#991b1b",
      border: "1px solid #fca5a5",
    };
  }

  return {
    background: "#dbeafe",
    color: "#1d4ed8",
    border: "1px solid #93c5fd",
  };
}

const styles: { [key: string]: React.CSSProperties } = {
  loginPage: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#eef5ff",
    padding: 24,
    boxSizing: "border-box",
  },
  loginCard: {
    width: "100%",
    maxWidth: 420,
    background: "#ffffff",
    borderRadius: 20,
    padding: 28,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    boxShadow: "0 20px 50px rgba(0,0,0,0.08)",
    boxSizing: "border-box",
  },
  successBanner: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #86efac",
    padding: "10px 14px",
    borderRadius: 10,
    fontWeight: 600,
    width: "100%",
    boxSizing: "border-box",
  },
  appShell: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "stretch",
    background: "#eef5ff",
    overflowX: "hidden",
  },
  sidebar: {
    width: 300,
    minWidth: 300,
    background: "#0f2f63",
    color: "#ffffff",
    padding: "24px 16px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 20,
    boxSizing: "border-box",
    minHeight: "100vh",
    position: "sticky",
    top: 0,
  },
  brandBox: {
    marginBottom: 18,
    textAlign: "center",
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: 700,
  },
  brandSub: {
    fontSize: 13,
    opacity: 0.85,
  },
  sideUserBox: {
    background: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    textAlign: "center",
  },
  sideUserName: {
    fontWeight: 700,
    fontSize: 18,
  },
  sideUserId: {
    fontSize: 13,
    opacity: 0.9,
    marginTop: 6,
  },
  navList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  sidebarButton: {
    background: "rgba(255,255,255,0.08)",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: "14px 18px",
    textAlign: "left",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    width: "100%",
  },
  sidebarButtonActive: {
    background: "#ffffff",
    color: "#123b75",
  },
  main: {
    flex: 1,
    width: "100%",
    minWidth: 0,
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    boxSizing: "border-box",
    overflowX: "hidden",
  },
  card: {
    width: "100%",
    background: "#ffffff",
    borderRadius: 20,
    padding: "24px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    boxSizing: "border-box",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 20,
  },
  cardTitle: {
    margin: 0,
    color: "#123b75",
    fontSize: 22,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    alignItems: "end",
    width: "100%",
  },
  filterGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "16px",
  marginBottom: 16,
  alignItems: "stretch", // FIX
  width: "100%",
},
  fieldWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minWidth: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#34527d",
    textAlign: "left",
  },
  input: {
    width: "100%",
    minWidth: 0,
    padding: "12px",
    height: "44px",
    borderRadius: 10,
    border: "1px solid #c7d8f5",
    fontSize: 14,
    boxSizing: "border-box",
    background: "#ffffff",
    color: "#000000",
  },
  fullRow: {
    gridColumn: "1 / -1",
    display: "flex",
    justifyContent: "flex-start",
    flexWrap: "wrap",
    gap: 12,
  },
  filterAction: {
    display: "flex",
    alignItems: "end",
    width: "100%",
  },
  primaryButton: {
    background: "#1f6feb",
    color: "#ffffff",
    border: "none",
    borderRadius: 10,
    padding: "10px 16px",
    cursor: "pointer",
    fontWeight: 700,
    minWidth: 160,
    height: "44px",
  },
  secondaryButton: {
  background: "#ffffff",
  color: "#1f6feb",
  border: "1px solid #1f6feb",
  borderRadius: 10,
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: 700,
  width: "100%",
  height: "44px", // ✅ same as input
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
},
  logoutButton: {
    background: "#ffffff",
    color: "#123b75",
    border: "none",
    borderRadius: 12,
    padding: "12px 14px",
    cursor: "pointer",
    fontWeight: 700,
    width: "100%",
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    minWidth: 900,
    borderCollapse: "collapse",
  },
  th: {
    background: "#f1f5ff",
    color: "#123b75",
    textAlign: "center",
    padding: "14px",
    borderBottom: "1px solid #cfe0fb",
    fontSize: 14,
    whiteSpace: "nowrap",
    fontWeight: 600,
  },
  td: {
  padding: "14px",
  borderBottom: "1px solid #eee",
  color: "#334155",
  verticalAlign: "middle", // FIX
  fontSize: 14,
  textAlign: "center",
  whiteSpace: "nowrap", // FIX (IMPORTANT)
},
  badge: {
  display: "inline-flex", // FIX
  alignItems: "center",
  justifyContent: "center",
  padding: "6px 12px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 12,
  whiteSpace: "nowrap", // FIX
},
  actionWrap: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  approveButton: {
    background: "#16a34a",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    padding: "8px 10px",
    cursor: "pointer",
    fontSize: 12,
  },
  rejectButton: {
    background: "#dc2626",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    padding: "8px 10px",
    cursor: "pointer",
    fontSize: 12,
  },
  revokeButton: {
    background: "#f59e0b",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    padding: "8px 10px",
    cursor: "pointer",
    fontSize: 12,
  },
  legendText: {
    marginTop: 0,
    marginBottom: 14,
    color: "#5d6f8a",
    fontSize: 14,
  },
  calendarExportBox: {
    background: "#ffffff",
    padding: 8,
    width: "100%",
    overflowX: "auto",
    boxSizing: "border-box",
  },
  exportTitle: {
    textAlign: "center",
    fontWeight: 700,
    color: "#123b75",
    fontSize: 18,
    marginBottom: 12,
  },
  fcEventBox: {
    fontSize: 11,
    lineHeight: 1.2,
    whiteSpace: "normal",
  },
  fcTitle: {
    fontWeight: 700,
  },
  fcLine: {
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  tooltip: {
    position: "fixed",
    zIndex: 2000,
    background: "#0f172a",
    color: "#ffffff",
    padding: "10px 12px",
    borderRadius: 10,
    boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
    pointerEvents: "none",
    maxWidth: 260,
    fontSize: 12,
  },
  tooltipTitle: {
    fontWeight: 700,
    marginBottom: 4,
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 2100,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    background: "#ffffff",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
    boxSizing: "border-box",
  },
  modalTitle: {
    marginTop: 0,
    color: "#123b75",
  },
  modalLine: {
    margin: "0 0 10px 0",
    color: "#334155",
  },
  errorText: {
    color: "#dc2626",
    margin: 0,
  },
};
