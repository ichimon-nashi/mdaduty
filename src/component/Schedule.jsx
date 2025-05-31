import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Tooltip } from 'react-tooltip';
import { getAllSchedulesForMonth, getEmployeeSchedule, getSchedulesByBase } from "../component/DataRoster.js";
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from './Navbar';

const Schedule = ({ userDetails }) => {
  // Available months
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

  // Function to find the latest month with data
  const findLatestMonthWithData = useCallback(() => {
    // Check months in reverse order (latest first)
    for (let i = availableMonths.length - 1; i >= 0; i--) {
      const month = availableMonths[i];
      const monthData = getAllSchedulesForMonth(month);
      if (monthData && monthData.length > 0) {
        return month;
      }
    }
    // If no data found, return the first available month as fallback
    return availableMonths[0];
  }, [availableMonths]);

  const [currentMonth, setCurrentMonth] = useState(() => findLatestMonthWithData());
  const [activeTab, setActiveTab] = useState(userDetails.base);
  const navigate = useNavigate();
  const [isAtBottom, setIsAtBottom] = useState(false);
  const containerRef = useRef(null);

  // State for tracking selected duties for duty change
  const [selectedDuties, setSelectedDuties] = useState([]);

  // State for tracking highlighted dates and employees
  const [highlightedDates, setHighlightedDates] = useState({});

  // Memoize expensive computations
  const scheduleData = useMemo(() => {
    const allSchedules = getAllSchedulesForMonth(currentMonth);
    const hasScheduleData = allSchedules.length > 0;
    const userSchedule = getEmployeeSchedule(userDetails?.employeeID, currentMonth);
    
    // Get all dates from the roster data
    const allDates = hasScheduleData && userSchedule ? 
      Object.keys(userSchedule.days).sort() : [];
    
    // Use optimized base filtering
    const otherSchedules = hasScheduleData ? 
      getSchedulesByBase(currentMonth, activeTab)
        .filter(schedule => schedule.employeeID !== userDetails?.employeeID) : [];
    
    return {
      allSchedules,
      hasScheduleData,
      userSchedule,
      allDates,
      otherSchedules
    };
  }, [currentMonth, activeTab, userDetails?.employeeID]);

  // Memoize helper functions to prevent re-creation on every render
  const getDayOfWeek = useCallback((dateStr) => {
    const date = new Date(dateStr);
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    return days[date.getDay()];
  }, []);

  const formatDate = useCallback((dateStr) => {
    const date = new Date(dateStr);
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
  }, []);

  const getDutyBackgroundColor = useCallback((duty) => {
    if (duty === '空' || duty === '休' || duty === '例' || duty === 'G' || duty === '') {
      return 'duty-off';
    } else if (duty === 'A/L' || duty === '福補') {
      return 'duty-leave';
    }
    return '';
  }, []);

  // Memoize employees with same duty to avoid recalculation
  const getEmployeesWithSameDuty = useCallback((date, duty) => {
    if (!duty || !scheduleData.hasScheduleData) return [];

    return scheduleData.allSchedules
      .filter(schedule => schedule.days[date] === duty && schedule.employeeID !== userDetails?.employeeID)
      .map(schedule => ({
        id: schedule.employeeID,
        name: schedule.name || '',
        rank: schedule.rank || '',
        duty: schedule.days[date]
      }));
  }, [scheduleData.allSchedules, scheduleData.hasScheduleData, userDetails?.employeeID]);

  // Optimize duty selection handler
  const handleDutySelect = useCallback((employeeId, name, date, duty) => {
    if (!scheduleData.hasScheduleData) {
      toast("此月份沒有班表資料！", {icon: '📅', duration: 3000});
      return;
    }

    const displayDuty = duty === "" ? "空" : duty;
    const existingIndex = selectedDuties.findIndex(item =>
      item.employeeId === employeeId && item.date === date
    );

    if (existingIndex >= 0) {
      // Remove selection
      const newSelectedDuties = [...selectedDuties];
      newSelectedDuties.splice(existingIndex, 1);
      setSelectedDuties(newSelectedDuties);

      // Remove employee from highlighted date
      setHighlightedDates(prev => {
        const newHighlightedDates = { ...prev };
        if (newHighlightedDates[date]) {
          newHighlightedDates[date] = newHighlightedDates[date].filter(id => id !== employeeId);
          if (newHighlightedDates[date].length === 0) {
            delete newHighlightedDates[date];
          }
        }
        return newHighlightedDates;
      });
    } else {
      // Add selection
      setSelectedDuties(prev => [...prev, {
        employeeId,
        name,
        date,
        duty: displayDuty
      }]);

      // Add employee to highlighted date
      setHighlightedDates(prev => {
        const newHighlightedDates = { ...prev };
        if (!newHighlightedDates[date]) {
          newHighlightedDates[date] = [];
        }
        newHighlightedDates[date] = [...newHighlightedDates[date], employeeId];
        return newHighlightedDates;
      });
    }
  }, [scheduleData.hasScheduleData, selectedDuties]);

  // Function to prepare data for DutyChange component
  const prepareForDutyChange = useCallback(() => {
    if (!scheduleData.hasScheduleData) {
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
  }, [scheduleData.hasScheduleData, selectedDuties, currentMonth, userDetails, navigate]);

  // Function to get user's tasks for the selected dates
  const getUserTaskForSelectedDates = useCallback((dates) => {
    if (!dates || dates.length === 0 || !scheduleData.userSchedule) return "";

    // Get user tasks for each date
    const tasks = dates.map(date => {
      const duty = scheduleData.userSchedule.days[date] || "";
      return duty === "" ? "空" : duty;
    });

    // Return tasks joined with comma
    return tasks.join('、');
  }, [scheduleData.userSchedule]);

  // Helper to format date for the form (YYYY-MM-DD to MM/DD)
  const formatDateForForm = useCallback((dateStr) => {
    const date = new Date(dateStr);
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
  }, []);

  // Handle month change with optimized clearing
  const handleMonthChange = useCallback((event) => {
    const newMonth = event.target.value;
    setCurrentMonth(newMonth);
    setSelectedDuties([]);
    setHighlightedDates({});
    
    // Check if data exists and show notification
    const newMonthData = getAllSchedulesForMonth(newMonth);
    if (!newMonthData || newMonthData.length === 0) {
      toast(`${newMonth}尚無班表資料`, {icon: '📅', duration: 2000});
    }
  }, []);

  // Optimize tab change
  const handleTabChange = useCallback((base) => {
    setActiveTab(base);
  }, []);

  // Memoize tooltip content generation
  const generateTooltipContent = useCallback((date, duty, sameEmployees) => {
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
  }, []);

  // Check if date should be highlighted
  const isDateHighlighted = useCallback((date, employeeId) => {
    return (highlightedDates[date] && highlightedDates[date].includes(employeeId)) ||
      (highlightedDates[date] && highlightedDates[date].some(id => id === scheduleData.userSchedule?.employeeID));
  }, [highlightedDates, scheduleData.userSchedule?.employeeID]);

  // Set up scroll synchronization (unchanged)
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
  }, [scheduleData.hasScheduleData]);

  // Set up scroll detection for bottom of page (unchanged)
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const scrollPosition = window.innerHeight + window.scrollY;
      const bottomThreshold = document.body.offsetHeight - 150;
      setIsAtBottom(scrollPosition >= bottomThreshold);
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen" ref={containerRef}>
      <Navbar 
        userDetails={userDetails} 
        title="豪神任務互換APP"
      />

      <div className="schedule-container">
        {/* Month Selection */}
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
          {!scheduleData.hasScheduleData && (
            <div className="no-data-warning">
              ⚠️ 此月份尚無班表資料
            </div>
          )}
        </div>

        {scheduleData.hasScheduleData ? (
          <>
            {/* User Schedule Section - same structure but using memoized data */}
            {scheduleData.userSchedule && (
              <div className="userScheduleContainer">
                <h2 className="section-title">Your Schedule</h2>
                <div className="table-container" id="user-schedule-table">
                  <table className="schedule-table">
                    <thead>
                      <tr className="table-header">
                        <th className="sticky-col employee-id">員編</th>
                        <th className="sticky-col employee-name">姓名</th>
                        <th className="col-rank">職位</th>
                        <th className="col-base">基地</th>
                        {scheduleData.allDates.map(date => (
                          <th key={date} className="date-col">
                            <div>{formatDate(date)}</div>
                            <div className="day-of-week">({getDayOfWeek(date)})</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="sticky-col employee-id-cell">{scheduleData.userSchedule.employeeID}</td>
                        <td className="sticky-col employee-name-cell">{scheduleData.userSchedule.name || '-'}</td>
                        <td className="rank-cell">{scheduleData.userSchedule.rank || '-'}</td>
                        <td className="base-cell">{scheduleData.userSchedule.base}</td>
                        {scheduleData.allDates.map(date => {
                          const duty = scheduleData.userSchedule.days[date];
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
              </div>
            )}

            {/* Filter Tabs */}
            <div className="crew-section">
              <h2 className="section-title">Crew Members' Schedule</h2>
              <div className="tab-container">
                <button
                  className={`tab TSATab ${activeTab === 'TSA' ? 'active' : ''}`}
                  onClick={() => handleTabChange('TSA')}
                >
                  TSA
                </button>
                <button
                  className={`tab RMQTab ${activeTab === 'RMQ' ? 'active' : ''}`}
                  onClick={() => handleTabChange('RMQ')}
                >
                  RMQ
                </button>
                <button
                  className={`tab KHHTab ${activeTab === 'KHH' ? 'active' : ''}`}
                  onClick={() => handleTabChange('KHH')}
                >
                  KHH
                </button>
                <button
                  className={`tab AllTab ${activeTab === 'ALL' ? 'active' : ''}`}
                  onClick={() => handleTabChange('ALL')}
                >
                  ALL
                </button>
              </div>
            </div>

            {/* Crew Schedule Table - using optimized filtered data */}
            <div className="crew-schedule-section">
              <div className="table-container" id="crew-schedule-table">
                <table className="schedule-table">
                  <thead>
                    <tr className="table-header">
                      <th className="sticky-col employee-id">員編</th>
                      <th className="sticky-col employee-name">姓名</th>
                      <th className="col-rank">職位</th>
                      <th className="col-base">基地</th>
                      {scheduleData.allDates.map(date => (
                        <th key={date} className="date-col">
                          <div>{formatDate(date)}</div>
                          <div className="day-of-week">({getDayOfWeek(date)})</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleData.otherSchedules.map(schedule => (
                      <tr key={schedule.employeeID}>
                        <td className="sticky-col employee-id-cell">{schedule.employeeID}</td>
                        <td className="sticky-col employee-name-cell">{schedule.name || '-'}</td>
                        <td className="rank-cell">{schedule.rank || '-'}</td>
                        <td className="base-cell">{schedule.base}</td>
                        {scheduleData.allDates.map(date => {
                          const duty = schedule.days[date];
                          const displayDuty = duty || "空";
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

            {/* Submit Button */}
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
              <p>目前僅有 <strong>2025年05月</strong> 和 <strong>2025年06月</strong> 的班表資料</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Schedule;