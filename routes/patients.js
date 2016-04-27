const express = require("express");
const router = express.Router({ mergeParams: true })
const knex = require("../db/knex");
const helpers = require('../helpers/authHelpers');

router.use(helpers.isAuthenticated);
router.use(helpers.currentUser);

// PatientInfo

// INDEX patients route
router.get('/', helpers.isPatient, (req,res) => {
  res.redirect(`/doctors/${req.params.doctor_id}/patients/${req.user.id}`)
})

// renders a new patient page as the doctor user
router.get('/new', helpers.isDoctor, (req, res) => {
  res.render("patients/new")
});

// POST the new patient into the database as doctor user
router.post('/', helpers.isDoctor, (req, res) => {
  knex('patients')
    .insert({
      isDoctor: false,
      childname: req.body.patient.childname,
      parentname: req.body.patient.parentname,
      username: req.body.patient.username,
      password: req.body.patient.password,
      doctor_id: +req.params.doctor_id
    })
    .then(() => {
      res.redirect(`/doctors/${req.params.doctor_id}`)
    }).catch(err => {
      console.log("Error Message: ", err)
      res.redirect(`/doctors/${req.params.doctor_id}`)
    })
});

// VIEW patient's dashboard
router.get('/:patient_id', helpers.isPatient, function(req,res){
    res.format({
      'text/html':() =>{
        knex('patients').where('id', +req.params.patient_id).first()
        .then(child => {
            console.log('CHILD', child.childname)
            res.render('patients/show', {child: child.childname});
        })
       },
      'application/json':() =>{
         knex.select(
           'exercises.name', 
           'exercises.id', 
           'exercises.difficulty',
           'plans.patient_id',
           'plans.routine',
           'plans.outcome',
           'plans.parent_comments',
           'plans.created_at',
           'patients.childname',
           'patients.doctor_id',
           'patients.parentname',
           'patients.username'
         ).from('patients')
           .join('plans', 'patients.id', 'plans.patient_id')
           .join('exercises', 'exercises.id', 'plans.exercise_id')
           .where('patients.id', +req.params.patient_id)
           .then((patient_plans)=>{res.send(patient_plans)});
       },
       'default': () => {
         // log the request and respond with 406
         res.status(406).send('Not Acceptable');
       }
    })
})

// EDIT
router.get('/edit/:id', helpers.isDoctor, (req, res) => {
    knex('patients').where("id", +req.params.id).first().then(patient => {
        res.render("patients/edit", { patient })
    });
});

// PUT
// needs work
router.put('/:id', helpers.isDoctor, (req, res) => {
    knex('patients').update(req.body.patient).where('id', +req.params.id)
        .then(() => {
            res.redirect(`/doctors/${req.params.doctor_id}`)
        });
});

// DELETE patient as doctor user
router.delete('/:id', helpers.isDoctor, (req, res) => {
    knex('patients').where('id', +req.params.id).del().returning('doctor_id')
        .then((doctor_id) => {
          console.log("What do we get back?", doctor_id)
            knex('doctors').join('patients', 'doctors.id', 'patients.doctor_id')
                .where('doctors.id', doctor_id[0])
                .then((data) => {
                  res.format({
                    'text/html': () => {
                        res.redirect('/')
                    },
                    'application/json': () => {
                        console.log("DATA from DEL: ", JSON.stringify(data));
                        res.send(data)
                    },
                    'default': () => {
                        // log the request and respond with 406
                        res.status(406).send('Not Acceptable');
                    }
                  })
                })
        })
});





module.exports = router;
