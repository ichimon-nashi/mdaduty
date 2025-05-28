import React, { useState, useEffect, useRef } from 'react';
import { Tooltip } from 'react-tooltip';
import { dataRoster } from "../component/DataRoster.js";
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from './Navbar';

const Schedule = ({ userDetails = { employeeID: '51892', name: '韓建豪', base: 'KHH' } }) => {

  const [currentMonth, setCurrentMonth] = useState(dataRoster.month);
  const [activeTab, setActiveTab] = useState(userDetails.base);
  const navigate = useNavigate();
  const [isAtBottom, setIsAtBottom] = useState(false);
  const containerRef = useRef(null);

  // State for tracking selected duties for duty change
  const [selectedDuties, setSelectedDuties] = useState([]);

  // State for tracking highlighted dates and employees - changed to store arrays of employeeIds
  const [highlightedDates, setHighlightedDates] = useState({});

  // Available months - you can modify this based on your data
  const availableMonths = [
    '2025年05月',
    '2025年06月',
    '2025年07月',
    '2025年08月',
    '2025年09月',
    '2025年10月',
    '2025年11月',
    '2025年12月'
  ];

  // Check if current month has data
  const hasScheduleData = currentMonth === dataRoster.month;

  // Find the logged-in user's schedule or use a default if none is found
  const userSchedule = hasScheduleData ? dataRoster.crew_schedules.find(
    schedule => schedule.employeeID === userDetails?.employeeID
  ) || dataRoster.crew_schedules[0] : null; // Use first schedule as fallback

  // Helper function to handle selecting duties
  const handleDutySelect = (employeeId, name, date, duty) => {
    if (!hasScheduleData) {
      toast("此月份沒有班表資料！", {icon: '📅', duration: 3000});
      return;
    }

    // Format empty duties as "空" for selection
    const displayDuty = duty === "" ? "空" : duty;

    const existingIndex = selectedDuties.findIndex(item =>
      item.employeeId === employeeId && item.date === date
    );

    if (existingIndex >= 0) {
      // If already selected, remove it
      const newSelectedDuties = [...selectedDuties];
      newSelectedDuties.splice(existingIndex, 1);
      setSelectedDuties(newSelectedDuties);

      // Remove employee from highlighted date
      const newHighlightedDates = { ...highlightedDates };
      if (newHighlightedDates[date]) {
        newHighlightedDates[date] = newHighlightedDates[date].filter(id => id !== employeeId);
        if (newHighlightedDates[date].length === 0) {
          delete newHighlightedDates[date];
        }
      }
      setHighlightedDates(newHighlightedDates);
    } else {
      // If not selected, add it
      setSelectedDuties([...selectedDuties, {
        employeeId,
        name,
        date,
        duty: displayDuty
      }]);

      // Add employee to highlighted date
      const newHighlightedDates = { ...highlightedDates };
      if (!newHighlightedDates[date]) {
        newHighlightedDates[date] = [];
      }
      newHighlightedDates[date] = [...newHighlightedDates[date], employeeId];
      setHighlightedDates(newHighlightedDates);
    }
  };

  // Function to prepare data for DutyChange component
  const prepareForDutyChange = () => {
    if (!hasScheduleData) {
      toast("此月份沒有班表資料，無法申請換班！", {icon: '❌', duration: 3000});
      return;
    }

    if (selectedDuties.length === 0) {
      toast("想換班還不選人喔!搞屁啊!", {icon: '😑', duration: 3000,});
      return;
    }

    // Sort selected duties by date
    const sortedDuties = [...selectedDuties].sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );

    // Group duties by employee
    const dutiesByEmployee = {};
    sortedDuties.forEach(duty => {
      if (!dutiesByEmployee[duty.employeeId]) {
        dutiesByEmployee[duty.employeeId] = {
          id: duty.employeeId,
          name: duty.name,
          duties: []
        };
      }
      dutiesByEmployee[duty.employeeId].duties.push({
        date: duty.date,
        duty: duty.duty
      });
    });

    // If selected duties are from multiple employees, alert user
    if (Object.keys(dutiesByEmployee).length > 1) {
      toast("別貪心，請只選擇一位換班!", {icon: '😒', duration: 3000,});
      return;
    }

    // Get the employee data
    const selectedEmployee = Object.values(dutiesByEmployee)[0];
    const duties = selectedEmployee.duties;

    // Format dates and duties
    let secondDate = '';
    let secondTask = '';

    if (duties.length === 1) {
      // Single date
      secondDate = formatDateForForm(duties[0].date);
      secondTask = duties[0].duty;
    } else {
      // Date range
      const startDate = formatDateForForm(duties[0].date);
      const endDate = formatDateForForm(duties[duties.length - 1].date);
      secondDate = `${startDate} - ${endDate}`;

      // Join duties with comma
      secondTask = duties.map(d => d.duty).join('、');
    }

    // Get the user tasks for the corresponding dates
    const userTasks = getUserTaskForSelectedDates(duties.map(d => d.date));

    // Navigate to DutyChange component with data
    navigate('/mdaduty/duty-change', {
      state: {
        firstID: userDetails.employeeID,
        firstName: userDetails.name,
        firstDate: secondDate, // Same date as second person
        firstTask: userTasks, // Tasks from user's schedule for those dates
        secondID: selectedEmployee.id,
        secondName: selectedEmployee.name,
        secondDate,
        secondTask,
        selectedMonth: currentMonth,
        allDuties: duties // Pass all individual duties for PDF generation
      }
    });

    // Clear selections and highlights after submission
    setSelectedDuties([]);
    setHighlightedDates({});
  };

  // Function to get user's tasks for the selected dates
  const getUserTaskForSelectedDates = (dates) => {
    if (!dates || dates.length === 0 || !userSchedule) return "";

    // Get user tasks for each date
    const tasks = dates.map(date => {
      const duty = userSchedule.days[date] || "";
      return duty === "" ? "空" : duty;
    });

    // Return tasks joined with comma
    return tasks.join('、');
  };

  // Helper to format date for the form (YYYY-MM-DD to MM/DD)
  const formatDateForForm = (dateStr) => {
    const date = new Date(dateStr);
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
  };

  // Get all dates from the roster data
  const allDates = hasScheduleData ? Object.keys(dataRoster.crew_schedules[0]?.days || {}).sort() : [];

  // Filter out other crew members' schedules based on selected tab
  const otherSchedules = hasScheduleData ? dataRoster.crew_schedules.filter(schedule => {
    // First filter out the current user
    if (schedule.employeeID === userDetails?.employeeID) return false;

    // Then apply the base filter according to the active tab
    if (activeTab === 'ALL') return true;
    return schedule.base === activeTab;
  }) : [];

  // Set up scroll synchronization and scroll position tracking
  useEffect(() => {
    const userTable = document.getElementById('user-schedule-table');
    const crewTable = document.getElementById('crew-schedule-table');

    if (userTable && crewTable) {
      const syncUserTable = () => {
        crewTable.scrollLeft = userTable.scrollLeft;
      };

      const syncCrewTable = () => {
        userTable.scrollLeft = crewTable.scrollLeft;
      };

      userTable.addEventListener('scroll', syncUserTable);
      crewTable.addEventListener('scroll', syncCrewTable);

      return () => {
        userTable.removeEventListener('scroll', syncUserTable);
        crewTable.removeEventListener('scroll', syncCrewTable);
      };
    }
  }, [hasScheduleData]);

  // Set up scroll detection for bottom of page
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const scrollPosition = window.innerHeight + window.scrollY;
      const bottomThreshold = document.body.offsetHeight - 150; // 150px threshold
      setIsAtBottom(scrollPosition >= bottomThreshold);
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial position
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Function to get the day of week for a given date
  const getDayOfWeek = (dateStr) => {
    const date = new Date(dateStr);
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    return days[date.getDay()];
  };

  // Function to get employees with the same duty on a given date
  const getEmployeesWithSameDuty = (date, duty) => {
    if (!duty || !hasScheduleData) return [];

    return dataRoster.crew_schedules
      .filter(schedule => schedule.days[date] === duty && schedule.employeeID !== userDetails?.employeeID)
      .map(schedule => {
        return {
          id: schedule.employeeID,
          name: schedule.name || '',
          rank: schedule.rank || '',
          duty: schedule.days[date]
        };
      });
  };

  // Format date for display (e.g., "05/01")
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
  };

  // Function to determine if a date cell should be highlighted - updated for array
  const isDateHighlighted = (date, employeeId) => {
    return (highlightedDates[date] && highlightedDates[date].includes(employeeId)) ||
      (highlightedDates[date] && highlightedDates[date].some(id => id === userSchedule?.employeeID));
  };

  // Function to get background color for duty
  const getDutyBackgroundColor = (duty) => {
    if (duty === '空' || duty === '休' || duty === '例' || duty === 'G' || duty === '') {
      return 'duty-off';
    } else if (duty === 'A/L' || duty === '福補') {
      return 'duty-leave';
    }
    return '';
  };

  // Handle month change
  const handleMonthChange = (event) => {
    const newMonth = event.target.value;
    setCurrentMonth(newMonth);
    // Clear selections when changing months
    setSelectedDuties([]);
    setHighlightedDates({});
    
    // Show notification if no data available for selected month
    if (newMonth !== dataRoster.month) {
      toast(`${newMonth}尚無班表資料`, {icon: '📅', duration: 2000});
    }
  };

  // Function to generate tooltip content for employees with same duty
  const generateTooltipContent = (date, duty, sameEmployees) => {
    const displayDuty = duty || "空";
    
    if (sameEmployees.length === 0) {
      return `<div class="tooltip-title">Duty: ${displayDuty}</div><div class="tooltip-text">No other employees with this duty</div>`;
    }
    
    let content = `<div class="tooltip-title">Same duty (${displayDuty}):</div>`;
    sameEmployees.forEach(emp => {
      content += `<div class="tooltip-employee">
        <div><span class="tooltip-label">員編:</span> ${emp.id}</div>
        <div><span class="tooltip-label">姓名:</span> ${emp.name || 'N/A'}</div>
        <div><span class="tooltip-label">職位:</span> ${emp.rank || 'N/A'}</div>
      </div>`;
    });
    
    return content;
  };

  return (
    <div className="min-h-screen" ref={containerRef}>
      {/* Use the Navbar component */}
      <Navbar 
        userDetails={userDetails} 
        title="豪神任務互換APP"
      />

      <div className="schedule-container">
        {/* Month Selection and Current Month Display */}
        <div className="month-selection-container">
          <div className="month-selector">
            <label htmlFor="month-select" className="month-label">選擇月份:</label>
            <select 
              id="month-select" 
              value={currentMonth} 
              onChange={handleMonthChange}
              className="month-dropdown"
            >
              {availableMonths.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
          <h1 className="schedule-heading">{currentMonth}班表</h1>
          {!hasScheduleData && (
            <div className="no-data-warning">
              ⚠️ 此月份尚無班表資料
            </div>
          )}
        </div>

        {hasScheduleData ? (
          <>
            {/* Logged In User Schedule */}
            <div className="userScheduleContainer">
              <h2 className="section-title">Your Schedule</h2>
              {userSchedule ? (
                <div className="table-container" id="user-schedule-table">
                  <table className="schedule-table">
                    <thead>
                      <tr className="table-header">
                        <th className="sticky-col employee-id">員編</th>
                        <th className="sticky-col employee-name">姓名</th>
                        <th className="col-rank">職位</th>
                        <th className="col-base">基地</th>
                        {allDates.map(date => (
                          <th key={date} className="date-col">
                            <div>{formatDate(date)}</div>
                            <div className="day-of-week">({getDayOfWeek(date)})</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="sticky-col employee-id-cell">{userSchedule.employeeID}</td>
                        <td className="sticky-col employee-name-cell">{userSchedule.name || '-'}</td>
                        <td className="rank-cell">{userSchedule.rank || '-'}</td>
                        <td className="base-cell">{userSchedule.base}</td>
                        {allDates.map(date => {
                          const duty = userSchedule.days[date];
                          const displayDuty = duty || "空";
                          const sameEmployees = getEmployeesWithSameDuty(date, duty);
                          const isHighlighted = highlightedDates[date] && highlightedDates[date].length > 0;
                          const bgColorClass = getDutyBackgroundColor(duty);
                          const tooltipId = `user-${date}`;

                          return (
                            <td
                              key={date}
                              className={`duty-cell ${bgColorClass} ${isHighlighted ? 'highlighted' : ''}`}
                            >
                              <div 
                                className="duty-content"
                                data-tooltip-id={tooltipId}
                                data-tooltip-html={sameEmployees.length > 0 ? generateTooltipContent(date, duty, sameEmployees) : ''}
                              >
                                {displayDuty}
                                {sameEmployees.length > 0 && (
                                  <Tooltip 
                                    id={tooltipId}
                                    className="react-tooltip"
                                    place="top"
                                  />
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="error-message">Your schedule data not found.</p>
              )}
            </div>

            {/* Filter Tabs for Crew Members' Schedule */}
            <div className="crew-section">
              <h2 className="section-title">Crew Members' Schedule</h2>
              <div className="tab-container">
                <button
                  className={`tab TSATab ${activeTab === 'TSA' ? 'active' : ''}`}
                  onClick={() => setActiveTab('TSA')}
                >
                  TSA
                </button>
                <button
                  className={`tab RMQTab ${activeTab === 'RMQ' ? 'active' : ''}`}
                  onClick={() => setActiveTab('RMQ')}
                >
                  RMQ
                </button>
                <button
                  className={`tab KHHTab ${activeTab === 'KHH' ? 'active' : ''}`}
                  onClick={() => setActiveTab('KHH')}
                >
                  KHH
                </button>
                <button
                  className={`tab AllTab ${activeTab === 'ALL' ? 'active' : ''}`}
                  onClick={() => setActiveTab('ALL')}
                >
                  ALL
                </button>
              </div>
            </div>

            {/* Other Crew Members' Schedule */}
            <div className="crew-schedule-section">
              <div className="table-container" id="crew-schedule-table">
                <table className="schedule-table">
                  <thead>
                    <tr className="table-header">
                      <th className="sticky-col employee-id">員編</th>
                      <th className="sticky-col employee-name">姓名</th>
                      <th className="col-rank">職位</th>
                      <th className="col-base">基地</th>
                      {allDates.map(date => (
                        <th key={date} className="date-col">
                          <div>{formatDate(date)}</div>
                          <div className="day-of-week">({getDayOfWeek(date)})</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {otherSchedules.map(schedule => (
                      <tr key={schedule.employeeID}>
                        <td className="sticky-col employee-id-cell">{schedule.employeeID}</td>
                        <td className="sticky-col employee-name-cell">{schedule.name || '-'}</td>
                        <td className="rank-cell">{schedule.rank || '-'}</td>
                        <td className="base-cell">{schedule.base}</td>
                        {allDates.map(date => {
                          const duty = schedule.days[date];
                          const displayDuty = duty || "空";
                          const userDuty = userSchedule?.days[date];
                          const sameEmployees = getEmployeesWithSameDuty(date, duty);
                          const isSelected = selectedDuties.some(item =>
                            item.employeeId === schedule.employeeID && item.date === date
                          );
                          const isHighlighted = isDateHighlighted(date, schedule.employeeID);
                          const bgColorClass = getDutyBackgroundColor(duty);
                          const tooltipId = `crew-${schedule.employeeID}-${date}`;

                          return (
                            <td
                              key={date}
                              className={`duty-cell selectable ${bgColorClass} ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                              onClick={() => handleDutySelect(
                                schedule.employeeID,
                                schedule.name,
                                date,
                                duty
                              )}
                            >
                              <div 
                                className="duty-content"
                                data-tooltip-id={tooltipId}
                                data-tooltip-html={generateTooltipContent(date, duty, sameEmployees)}
                              >
                                {displayDuty}
                                <Tooltip 
                                  id={tooltipId}
                                  className="react-tooltip"
                                  place="top"
                                />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Submit Button - Dynamically positioned */}
            {isAtBottom ? (
              <div className="submit-button-container">
                <button
                  onClick={prepareForDutyChange}
                  className="dutyChangeButton"
                >
                  提交換班申請
                </button>
              </div>
            ) : (
              <div className="submit-button-sticky">
                <button
                  onClick={prepareForDutyChange}
                  className="dutyChangeButton"
                >
                  提交換班申請
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="no-data-container">
            <div className="no-data-message">
              <h3>📅 此月份暫無班表資料</h3>
              <p>請選擇其他月份或等待資料更新</p>
              <p>目前僅有 <strong>{dataRoster.month}</strong> 的班表資料</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Schedule;
      