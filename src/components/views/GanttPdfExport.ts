"use client";

import type { Task, Project } from "@/types/database";

/**
 * Gantt Çizelgesini İstemci Tarafında $0 Maliyetle PDF formatına dönüştürme ve indirme.
 * Mobil cihazlarda doğrudan yatay (landscape) PDF olarak kaydetme penceresini açar.
 */
export function exportGanttToPdf(project: Project | null, tasks: Task[]) {
  const projectName = project?.name || "İş Takip Çizelgesi";
  const dateFormatted = new Date().toLocaleDateString("tr-TR");

  // Yazdırılabilir HTML penceresi oluştur
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Lütfen açılır pencerelere (pop-up) izin veriniz.");
    return;
  }

  const tasksWithDates = tasks.filter((t) => t.start_date || t.due_date);

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <title>${projectName} - Gantt Çizelgesi</title>
      <style>
        @page {
          size: landscape;
          margin: 15mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 20px;
          color: #1e293b;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        h1 {
          font-size: 20px;
          margin: 0;
          color: #0f172a;
        }
        .meta {
          font-size: 12px;
          color: #64748b;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        th, td {
          border: 1px solid #e2e8f0;
          padding: 8px 10px;
          text-align: left;
        }
        th {
          background-color: #f8fafc;
          font-weight: 600;
          color: #475569;
        }
        .color-badge {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 3px;
          margin-right: 6px;
          vertical-align: middle;
        }
        .status-done {
          text-decoration: line-through;
          color: #94a3b8;
        }
        .timeline-bar {
          height: 16px;
          border-radius: 4px;
          opacity: 0.85;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>${projectName} - Gantt Zaman Çizelgesi</h1>
          <div class="meta">Rapor Tarihi: ${dateFormatted} • Toplam: ${tasks.length} Görev</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 28%;">Görev Başlığı</th>
            <th style="width: 12%;">Başlangıç</th>
            <th style="width: 12%;">Bitiş</th>
            <th style="width: 12%;">Öncelik</th>
            <th style="width: 12%;">Durum</th>
            <th style="width: 24%;">Sorumlular</th>
          </tr>
        </thead>
        <tbody>
          ${tasks
            .map((task) => {
              const start = task.start_date
                ? new Date(task.start_date).toLocaleDateString("tr-TR")
                : "-";
              const due = task.due_date
                ? new Date(task.due_date).toLocaleDateString("tr-TR")
                : "-";
              const isDone = task.status === "done";
              const assignees =
                task.assignees?.map((a) => a.full_name).join(", ") ||
                task.assigned_profile?.full_name ||
                "Atanmamış";

              return `
              <tr class="${isDone ? "status-done" : ""}">
                <td>
                  <span class="color-badge" style="background-color: ${
                    task.task_color || "#6366f1"
                  }"></span>
                  <strong>${task.title}</strong>
                </td>
                <td>${start}</td>
                <td>${due}</td>
                <td>${task.priority || "normal"}</td>
                <td>${isDone ? "Tamamlandı" : task.status === "in_progress" ? "Devam Ediyor" : "Yapılacak"}</td>
                <td>${assignees}</td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
