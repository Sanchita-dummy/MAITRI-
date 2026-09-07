import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.schemas.schemas import DepartmentOut, ProblemCreate, ProblemOut

router = APIRouter(prefix="/api", tags=["Departments & Problems"])


@router.get("/departments", response_model=list[DepartmentOut])
def list_departments(db: Session = Depends(get_db)):
    return db.query(models.Department).all()


@router.get("/problems", response_model=list[ProblemOut])
def list_problems(department_id: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Problem)
    if department_id:
        q = q.filter(models.Problem.department_id == department_id)
    return q.order_by(models.Problem.created_at.desc()).all()


@router.get("/problems/{problem_id}", response_model=ProblemOut)
def get_problem(problem_id: str, db: Session = Depends(get_db)):
    problem = db.query(models.Problem).filter(models.Problem.problem_id == problem_id).first()
    if not problem:
        raise HTTPException(404, "Problem not found")
    return problem


@router.post("/problems", response_model=ProblemOut)
def create_problem(payload: ProblemCreate, db: Session = Depends(get_db)):
    dept = db.query(models.Department).filter(
        models.Department.department_id == payload.department_id
    ).first()
    if not dept:
        raise HTTPException(404, "Department not found")

    problem = models.Problem(
        problem_id=f"PROB{uuid.uuid4().hex[:8].upper()}",
        department_id=payload.department_id,
        title=payload.title,
        description=payload.description,
        sector=payload.sector or dept.sector,
        priority=payload.priority,
        status="SUBMITTED",
        synthetic=False,
    )
    db.add(problem)
    db.commit()
    db.refresh(problem)
    return problem
