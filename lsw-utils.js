(function (factory) {
  const mod = factory();
  if (typeof window !== 'undefined') {
    window['LswUtils'] = mod;
  }
  if (typeof global !== 'undefined') {
    global['LswUtils'] = mod;
  }
  if (typeof module !== 'undefined') {
    module.exports = mod;
  }
})(function () {

  const LswUtils = {};

  LswUtils.hello = () => console.log("Hello!");

  ///////////////////////////////////////////////////////
  // API de Excel: usa SheetJS
  Object.assign(LswUtils, {
    readFileAsArrayBuffer(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.onerror = error => reject(error);
        reader.readAsArrayBuffer(file);
      });
    },
    readFileAsText(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.onerror = error => reject(error);
        reader.readAsText(file);
      });
    },
    readFileAsBinaryString(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.onerror = error => reject(error);
        reader.readAsBinaryString(file);
      });
    },
    selectFile() {
      return new Promise(resolve => {
        const inputHtml = document.createElement("input");
        inputHtml.setAttribute("type", "file");
        inputHtml.setAttribute("accept", ".ods,.xlsx,.xls,.csv");
        inputHtml.style.display = "none";
        document.body.appendChild(inputHtml);
        inputHtml.addEventListener("change", event => {
          try {
            const file = event.target.files[0];
            if (file) {
              return resolve(file);
            } else {
              return resolve(undefined);
            }
          } catch (error) {
            console.log("This should not happen :(", error);
          } finally {
            inputHtml.remove();
          }
        });
        inputHtml.click();
      });
    },
    sheetToArray(sheet) {
      // Obtener el rango de celdas activo de la hoja
      const range = sheet['!ref']; // Ejemplo: 'A1:C3'
      // Extraer las coordenadas de la celda inicial y final del rango
      const [startCell, endCell] = range.split(':');
      const startCol = startCell.match(/[A-Z]+/)[0]; // Columna de la primera celda (por ejemplo, 'A')
      const startRow = parseInt(startCell.match(/\d+/)[0], 10); // Fila de la primera celda (por ejemplo, 1)
      const endCol = endCell.match(/[A-Z]+/)[0]; // Columna de la última celda (por ejemplo, 'C')
      const endRow = parseInt(endCell.match(/\d+/)[0], 10); // Fila de la última celda (por ejemplo, 3)
      const data = [];
      // Iterar sobre las filas y columnas dentro del rango
      for (let row = startRow; row <= endRow; row++) {
        const rowData = [];
        for (let col = startCol.charCodeAt(0); col <= endCol.charCodeAt(0); col++) {
          const cellAddress = String.fromCharCode(col) + row;
          const cell = sheet[cellAddress]; // Obtener la celda
          rowData.push(cell ? cell.v : null); // Si la celda existe, tomar su valor. Si no, agregar `null`
        }
        data.push(rowData); // Agregar la fila al array de datos
      }
      return data;
    }
  });

  ///////////////////////////////////////////////////////
  // API de Conductometria: usa API de Excel (so: SheetJS)
  Object.assign(LswUtils, {
    isDatePassed(date, time, currentDate = new Date()) {
      const [day, month, year] = date.split("/").map(Number);
      const [hour, minute, second] = time.split(":").map(Number);
      const targetDate = new Date(year, month-1, day, hour, minute, second);
      return currentDate > targetDate;
    },
    sheetToRegistros(sheet, asObjectIsOkay = false) {
      const raw = this.sheetToArray(sheet);
      const byDate = {};
      let lastDate = undefined;
      const currentDate = new Date();
      Compact_by_date_using_last_date: {
        for (let index = 0; index < raw.length; index++) {
          const cells = raw[index];
          const [time, content] = cells;
          const isDate = time.match(/[0-9][0-9]\/[0-9][0-9]\/[0-9][0-9]/g);
          if (isDate) {
            if (!(time in byDate)) {
              byDate[time] = {};
            }
            lastDate = time;
          } else {
            if (typeof content === "string") {
              if (!(time in byDate[lastDate])) {
                byDate[lastDate][time] = [];
              }
              Add_properties_to_hour: {
              }
              const items = content.split(".").filter(l => l !== "");
              for (let indexItem = 0; indexItem < items.length; indexItem++) {
                const item = items[indexItem];
                const [name, details] = item.split(":").filter(l => l !== "");
                let event = {};
                Add_properties_to_event: {
                  Object.assign(event, { name });
                  Object.assign(event, details ? { details: details.trim() } : {});
                }
                byDate[lastDate][time].push(event);
              }
            }
          }
        }
      }
      if (asObjectIsOkay) {
        return byDate;
      }
      const output = [];
      Format_to_pure_array_to_avoid_confusions: {
        const daysSorted = Object.keys(byDate).sort();
        for (let index_day = 0; index_day < daysSorted.length; index_day++) {
          const day_id = daysSorted[index_day];
          const day_data = byDate[day_id];
          const day_output = {
            day: day_id,
            hours: []
          };
          const hoursSorted = Object.keys(day_data).sort();
          for (let index_hour = 0; index_hour < hoursSorted.length; index_hour++) {
            const hour_id = hoursSorted[index_hour];
            const hour_data = day_data[hour_id];
            const hour_is_passed = this.isDatePassed(day_id, hour_id, currentDate);
            const hour_is_current = hour_is_passed && (() => {
              const [hours, minutes, seconds] = hour_id.split(":").map(Number);
              const hour_next_id = [hours + 1, minutes, seconds].map(t => ("" + t).padStart(2, "0")).join(":");
              console.log(hour_next_id);
              return !this.isDatePassed(day_id, hour_next_id, currentDate);
            })();
            const hour_output = {
              hour: hour_id,
              events: [],
              passed: hour_is_passed,
              current: hour_is_current,
            };
            for (let index_item = 0; index_item < hour_data.length; index_item++) {
              const item = hour_data[index_item];
              hour_output.events.push(item);
            }
            day_output.hours.push(hour_output);
          }
          output.push(day_output);
        }
      }
      return output;
    },
    async loadConductometriaByExcelFile() {
      try {
        const file = await this.selectFile();
        const data = await this.readFileAsBinaryString(file);
        const workbook = XLSX.read(data, { type: "binary", cellDates: false });
        const sheet = workbook.Sheets["Tracking"];
        const registros = this.sheetToRegistros(sheet);
        return { registros };
      } catch (error) {
        console.log(error);
      }
    },
  });

  return LswUtils;
});